const socket = io(); // Conecta ao servidor Socket.IO
let playerId = null; // ID do jogador
let gameState = {
    players: {},
    board: Array(8).fill().map(() => Array(8).fill(null)),
};

// Função para registrar o jogador e iniciar o jogo
function registerPlayer() {
    playerId = document.getElementById("player-id").value;
    if (playerId) {
        socket.emit('registerPlayer', playerId);
        document.getElementById("player-registration").style.display = 'none'; // Esconde o formulário
        document.getElementById("game-board").style.display = 'block'; // Mostra o tabuleiro
        document.getElementById("controls").style.display = 'block'; // Mostra os controles
    } else {
        alert("Por favor, insira um nome ou ID válido.");
    }
}

// Escuta por atualizações do jogo do servidor
socket.on('updateGame', (data) => {
    console.log(`Atualização recebida:`, data); // Log para depuração
    gameState = data; // Atualiza o estado do jogo localmente
    renderGameState(); // Chama a função para atualizar a UI
});

// Escuta para o evento de início do jogo
socket.on('startGame', (data) => {
    console.log("O jogo começou!");
    gameState = data; // Atualiza o estado do jogo localmente
    renderGameState(); // Chama a função para atualizar a UI
});

// Função para renderizar o estado do jogo
function renderGameState() {
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerHTML = ""; // Limpa o conteúdo do tabuleiro

    for (let row = 0; row < gameState.board.length; row++) {
        for (let col = 0; col < gameState.board[row].length; col++) {
            const cellContent = gameState.board[row][col];
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (cellContent) {
                if (cellContent.type === 'base') {
                    cell.textContent = '🏰'; // Ícone da base
                    cell.classList.add(`player${cellContent.player}`);
                } else {
                    cell.textContent = characters[cellContent.type].icon; // Ícone da personagem
                    cell.classList.add(`player${cellContent.player}`);
                }
                addHealthBar(cell, cellContent.health);
            }

            gameBoard.appendChild(cell);
        }
    }
}

// Função para adicionar uma barra de vida à célula
function addHealthBar(cell, health) {
    const healthBar = document.createElement("div");
    healthBar.classList.add("health-bar");
    healthBar.style.width = `${(health / 12) * 100}%`; // Ajuste conforme a vida máxima
    cell.appendChild(healthBar);
}

// Função para executar um ataque
function executeAttack(row, col) {
    const target = gameState.board[row][col];
    const attacker = selectedCharacter.character;
    const damage = attacker.attack || 1;

    if (target) {
        target.health -= damage;
        showDamageIndicator(row, col, damage);
        updateHealthBar(row, col, target.health);

        if (target.type === 'base' && target.health <= 0) {
            announceWinner();
            return;
        }

        if (target.health <= 0) {
            gameState.board[row][col] = null; // Remove o alvo se a vida for <= 0
        }
    }

    // Envia a ação para o servidor
    socket.emit('playerAction', {
        action: 'attack',
        target: { row, col, previousHealth: target.health + damage },
        player: playerId // Identifica o jogador
    });

    playerEnergy -= energyCost.attack;
    updateEnergyDisplay();
    clearAttackHighlights();
    lastAction = { type: 'attack', target: { row, col, previousHealth: target.health + damage } };
    selectedCharacter = null;
}

// Função para mover o personagem
function moveCharacter(newRow, newCol) {
    const { row, col, character } = selectedCharacter;

    // Verifica se o movimento é válido (apenas em cruz)
    if (Math.abs(newRow - row) + Math.abs(newCol - col) !== 1) {
        updateMessage("Movimento inválido. Personagens só podem se mover em linha reta.");
        return;
    }

    gameState.board[newRow][newCol] = character;
    gameState.board[row][col] = null;

    // Envia o movimento para o servidor
    socket.emit('playerAction', {
        action: 'move',
        from: { row, col },
        to: { newRow, newCol },
        character,
        player: playerId
    });

    lastAction = { type: 'move', from: [row, col], to: [newRow, newCol], character };
    selectedCharacter = null;
}

// Adicione outras funções para executar ações (mover, atacar, etc.) conforme necessário...

// Seleciona personagem para atacar
function selectCharacterToAttack(row, col) {
    const cellContent = board[row][col];
    if (cellContent && cellContent.player === currentPlayer) {
        selectedCharacter = { row, col, character: cellContent };
        highlightAttackableTargets(row, col, cellContent.type);
    } else if (selectedCharacter && board[row][col] && board[row][col].player !== currentPlayer) {
        executeAttack(row, col);
    }
}

// Realiza o ataque e desconta o dano do alvo
function executeAttack(row, col) {
    const target = board[row][col];
    const attacker = selectedCharacter.character;
    const damage = attacker.attack || 1;

    if (target) {
        target.health -= damage;
        showDamageIndicator(row, col, damage);
        updateHealthBar(row, col, target.health);

        if (target.type === 'base' && target.health <= 0) {
            announceWinner();
            return;
        }

        if (target.health <= 0) {
            board[row][col] = null;
            const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
            cell.textContent = "";
            cell.classList.remove(`player${target.player}`);
        }
    }
    playerEnergy -= energyCost.attack;
    updateEnergyDisplay();
    clearAttackHighlights();
    lastAction = { type: 'attack', target: { row, col, previousHealth: target.health + damage } };
    selectedCharacter = null;
}

// Atualiza a barra de vida
function updateHealthBar(row, col, health) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    const healthBar = cell.querySelector(".health-bar");
    if (healthBar) {
        healthBar.style.width = `${(health / 12) * 100}%`;
    }
}

// Exibe indicador de dano temporário
function showDamageIndicator(row, col, damage) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    const damageIndicator = document.createElement("div");
    damageIndicator.classList.add("damage-indicator");
    damageIndicator.textContent = `-${damage}`;
    cell.appendChild(damageIndicator);

    setTimeout(() => cell.removeChild(damageIndicator), 1000);
}

// Destaca células movíveis, ataque e adjacentes
function highlightMovableCells(row, col) {
    const moveRange = [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
    ];
    moveRange.forEach(([r, c]) => {
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
            document.querySelector(`[data-row='${r}'][data-col='${c}']`).classList.add("movable");
        }
    });
}

// Destaca os alvos que podem ser atacados
function highlightAttackableTargets(row, col, characterType) {
    const range = characters[characterType].range;
    const attackRange = [];

    for (let r = -range; r <= range; r++) {
        for (let c = -range; c <= range; c++) {
            const newRow = row + r;
            const newCol = col + c;
            if (
                newRow >= 0 && newRow < boardSize &&
                newCol >= 0 && newCol < boardSize &&
                (Math.abs(r) + Math.abs(c) <= range) &&
                board[newRow][newCol] && board[newRow][newCol].player !== currentPlayer
            ) {
                attackRange.push([newRow, newCol]);
            }
        }
    }

    attackRange.forEach(([r, c]) => {
        document.querySelector(`[data-row='${r}'][data-col='${c}']`).classList.add("attackable");
    });
}

// Anuncia o vencedor e termina o jogo
function announceWinner() {
    alert(`Jogador ${currentPlayer} venceu o jogo!`);
    resetGame();
}

// Remove destaques de movimentação e ataque
function clearMovableHighlights() {
    document.querySelectorAll(".movable").forEach(cell => cell.classList.remove("movable"));
}

function clearAttackHighlights() {
    document.querySelectorAll(".attackable").forEach(cell => cell.classList.remove("attackable"));
}

// Atualiza a mensagem no campo de mensagens
function updateMessage(text) {
    document.getElementById("message").textContent = `Ação: ${text}`;
}

// Seleciona a ação
function selectAction(action) {
    selectedAction = action;
    clearAllHighlights();
    let actionText = "";

    switch (action) {
        case 'base':
            actionText = "Coloque sua base inicial";
            break;
        case 'warrior':
            actionText = "Coloque um guerreiro ao lado da base";
            highlightAddableCells();
            break;
        case 'archer':
            actionText = "Coloque um arqueiro ao lado da base";
            highlightAddableCells();
            break;
        case 'tank':
            actionText = "Coloque um tanque ao lado da base";
            highlightAddableCells();
            break;
        case 'healer':
            actionText = "Coloque um healer ao lado da base";
            highlightAddableCells();
            break;
        case 'move':
            actionText = "Selecione um personagem para mover";
            highlightSelectableCharacters();
            break;
        case 'attack':
            actionText = "Selecione um personagem para atacar";
            highlightSelectableCharacters();
            break;
    }

    updateMessage(actionText);
}

// Termina o turno
function endTurn() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    playerEnergy = 5;
    document.getElementById("turn-info").textContent = `Turno do Jogador ${currentPlayer}`;
    updateEnergyDisplay();
    selectedAction = null;
    selectedCharacter = null;
    clearAllHighlights();
    undoAvailable[currentPlayer] = true;
}

// Retrocede a última ação
function undoAction() {
    if (!undoAvailable[currentPlayer] || !lastAction) {
        updateMessage("Retroceder indisponível");
        return;
    }

    switch (lastAction.type) {
        case 'move':
            const { from, to, character } = lastAction;
            board[from[0]][from[1]] = character;
            board[to[0]][to[1]] = null;

            updateCell(from[0], from[1], character);
            clearCell(to[0], to[1]);
            playerEnergy += energyCost.move;
            break;

        case 'attack':
            const { row, col, previousHealth } = lastAction.target;
            board[row][col].health = previousHealth;
            updateHealthBar(row, col, previousHealth);
            playerEnergy += energyCost.attack;
            break;

        case 'add':
            const { row: addRow, col: addCol } = lastAction;
            board[addRow][addCol] = null;
            clearCell(addRow, addCol);
            playerEnergy += energyCost[lastAction.character];
            break;
    }

    updateEnergyDisplay();
    undoAvailable[currentPlayer] = false;  // Retrocesso só permitido uma vez por turno
    lastAction = null;
}

function updateCell(row, col, character) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    cell.textContent = characters[character.type].icon;
    cell.classList.add(`player${currentPlayer}`);
    addHealthBar(cell, character.health);
}

function clearCell(row, col) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    cell.textContent = "";
    cell.classList.remove(`player${currentPlayer}`);
}

// Limpa todos os destaques das células
function clearAllHighlights() {
    clearMovableHighlights();
    clearAttackHighlights();
    document.querySelectorAll(".addable").forEach(cell => cell.classList.remove("addable"));
    document.querySelectorAll(".selectable").forEach(cell => cell.classList.remove("selectable"));
}

// Destaca as células ao redor da base onde se pode adicionar personagens
function highlightAddableCells() {
    const baseCells = getBaseCells(currentPlayer);
    baseCells.forEach(([r, c]) => {
        const addableCells = [
            [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
            [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]
        ];
        addableCells.forEach(([nr, nc]) => {
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && board[nr][nc] === null) {
                document.querySelector(`[data-row='${nr}'][data-col='${nc}']`).classList.add("addable");
            }
        });
    });
}

// Destaca as personagens que podem realizar uma ação (mover ou atacar)
function highlightSelectableCharacters() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cellContent = board[row][col];
            if (cellContent && cellContent.player === currentPlayer && (selectedAction === 'move' || selectedAction === 'attack')) {
                document.querySelector(`[data-row='${row}'][data-col='${col}']`).classList.add("selectable");
            }
        }
    }
}

// Reinicia o jogo
function resetGame() {
    currentPlayer = 1;
    basePlaced = { 1: false, 2: false };
    selectedCharacter = null;
    playerEnergy = 5;
    undoAvailable = { 1: true, 2: true };
    createBoard();
}

// Inicializa o jogo ao carregar a página
window.onload = createBoard;

