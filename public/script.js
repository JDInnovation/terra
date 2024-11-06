const boardSize = 8;
let currentPlayer = 1;
let board = [];
let basePlaced = { 1: false, 2: false };
let selectedAction = "base";
let selectedCharacter = null;
let playerEnergy = 5;
let lastAction = null;  // Para armazenar a última ação para retroceder
let undoAvailable = { 1: true, 2: true };

// Personagens e construções
const characters = {
    warrior: { icon: '🗡️', moves: 1, attack: 1, health: 4, range: 1 },
    archer: { icon: '🏹', moves: 1, attack: 0.5, health: 3, range: 2 },
    tank: { icon: '🛡️', moves: 1, attack: 0.5, health: 12, range: 1 },
    healer: { icon: '🩹', moves: 1, attack: 0, health: 3, heal: 2, range: 1 },
    base: { icon: '🏰', moves: 0, attack: 1, health: 8, range: 1 }  // Base com vida reduzida
};

// Custo de energia para ações
const energyCost = {
    base: 3,
    warrior: 3,
    archer: 3,
    tank: 4,
    healer: 3,
    move: 1,
    attack: 2
};

// Inicializa o tabuleiro
function createBoard() {
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerHTML = "";
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener("click", () => handleCellClick(row, col, cell));
            gameBoard.appendChild(cell);
        }
    }

    updateMessage("Coloque sua base inicial");
    updateEnergyDisplay();
}

// Atualiza a exibição de energia
function updateEnergyDisplay() {
    document.getElementById("energy-info").textContent = `Energia Restante: ${playerEnergy}`;
}

// Manipula clique na célula
function handleCellClick(row, col, cell) {
    if (playerEnergy < energyCost[selectedAction]) {
        updateMessage("Energia insuficiente para esta ação");
        return;
    }

    if (selectedAction === 'base' && !basePlaced[currentPlayer]) {
        placeBase(row, col);
    } else if (selectedAction && basePlaced[currentPlayer]) {
        switch (selectedAction) {
            case 'warrior':
            case 'archer':
            case 'tank':
            case 'healer':
                if (isAdjacentToBase(row, col)) {
                    addCharacter(row, col, selectedAction);
                } else {
                    updateMessage("Jogue na zona obrigatória");
                }
                break;
            case 'move':
                selectCharacterToMove(row, col);
                break;
            case 'attack':
                selectCharacterToAttack(row, col);
                break;
        }
    }
}

// Verifica se a célula é adjacente à base
function isAdjacentToBase(row, col) {
    const baseCells = getBaseCells(currentPlayer);
    return baseCells.some(([r, c]) => Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1);
}

// Obter células da base
function getBaseCells(player) {
    return board.flatMap((rowArr, row) => 
        rowArr.map((cell, col) => (cell && cell.type === 'base' && cell.player === player ? [row, col] : null))
    ).filter(cell => cell !== null);
}

// Coloca a base
function placeBase(row, col) {
    if (board[row][col] === null) {
        board[row][col] = { type: 'base', player: currentPlayer, health: characters.base.health };
        const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
        cell.textContent = characters.base.icon;
        cell.classList.add(`player${currentPlayer}`);
        basePlaced[currentPlayer] = true;
        playerEnergy -= energyCost.base;
        updateEnergyDisplay();
        lastAction = null;  // A base não pode ser desfeita
    }
}

// Adiciona personagem
function addCharacter(row, col, character) {
    if (board[row][col] === null) {
        board[row][col] = { type: character, player: currentPlayer, health: characters[character].health };
        const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
        cell.textContent = characters[character].icon;
        cell.classList.add(`player${currentPlayer}`);
        addHealthBar(cell, characters[character].health);
        playerEnergy -= energyCost[character];
        updateEnergyDisplay();
        lastAction = { type: 'add', row, col, character, player: currentPlayer };
    }
}

// Adiciona uma barra de vida ao personagem
function addHealthBar(cell, health) {
    const healthBar = document.createElement("div");
    healthBar.classList.add("health-bar");
    healthBar.style.width = `${(health / 12) * 100}%`; // Vida máxima
    cell.appendChild(healthBar);
}

// Seleciona personagem para mover
function selectCharacterToMove(row, col) {
    const cellContent = board[row][col];
    if (cellContent && cellContent.player === currentPlayer && cellContent.type !== 'base') {
        selectedCharacter = { row, col, character: cellContent };
        highlightMovableCells(row, col);
    } else if (selectedCharacter && board[row][col] === null) {
        moveCharacter(row, col);
    }
}

// Move o personagem para a nova célula
function moveCharacter(newRow, newCol) {
    const { row, col, character } = selectedCharacter;
    board[newRow][newCol] = character;
    board[row][col] = null;

    const oldCell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    oldCell.textContent = "";
    oldCell.classList.remove(`player${currentPlayer}`, "movable");

    const newCell = document.querySelector(`[data-row='${newRow}'][data-col='${newCol}']`);
    newCell.textContent = characters[character.type].icon;
    newCell.classList.add(`player${currentPlayer}`);
    addHealthBar(newCell, character.health);

    playerEnergy -= energyCost.move;
    updateEnergyDisplay();
    clearMovableHighlights();
    lastAction = { type: 'move', from: [row, col], to: [newRow, newCol], character: character };
    selectedCharacter = null;
}

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

const socket = io(); // Conecta ao servidor Socket.IO

// Função para executar o ataque
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

    // Envia a ação para o servidor
    socket.emit('playerAction', {
        action: 'attack',
        target: { row, col, previousHealth: target.health + damage },
        player: currentPlayer
    });

    playerEnergy -= energyCost.attack;
    updateEnergyDisplay();
    clearAttackHighlights();
    lastAction = { type: 'attack', target: { row, col, previousHealth: target.health + damage } };
    selectedCharacter = null;
}

// Escuta por atualizações do jogo do servidor
socket.on('updateGame', (data) => {
    // Atualiza o estado do jogo de acordo com a ação recebida
    switch (data.action) {
        case 'attack':
            const { row, col, previousHealth } = data.target;
            const targetCell = board[row][col];
            if (targetCell) {
                targetCell.health = previousHealth;
                if (targetCell.health <= 0) {
                    board[row][col] = null; // Remove o alvo se a vida for <= 0
                    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
                    cell.textContent = "";
                    cell.classList.remove(`player${targetCell.player}`);
                }
            }
            updateHealthBar(row, col, previousHealth);
            break;
        // Adicione mais casos para outras ações (como movimento)
    }
});

// Exemplo de como enviar dados de movimento
function moveCharacter(newRow, newCol) {
    const { row, col, character } = selectedCharacter;

    // Verifica se o movimento é válido (apenas em cruz)
    if (Math.abs(newRow - row) + Math.abs(newCol - col) !== 1) {
        updateMessage("Movimento inválido. Personagens só podem se mover em linha reta.");
        return;
    }

    board[newRow][newCol] = character;
    board[row][col] = null;

    const oldCell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    oldCell.textContent = "";
    oldCell.classList.remove(`player${currentPlayer}`, "movable");

    const newCell = document.querySelector(`[data-row='${newRow}'][data-col='${newCol}']`);
    newCell.textContent = characters[character.type].icon;
    newCell.classList.add(`player${currentPlayer}`);
    addHealthBar(newCell, character.health);

    playerEnergy -= energyCost.move;
    updateEnergyDisplay();
    clearMovableHighlights();

    // Envia o movimento para o servidor
    socket.emit('playerAction', {
        action: 'move',
        from: { row, col },
        to: { newRow, newCol },
        character
    });

    lastAction = { type: 'move', from: [row, col], to: [newRow, newCol], character };
    selectedCharacter = null;
}
