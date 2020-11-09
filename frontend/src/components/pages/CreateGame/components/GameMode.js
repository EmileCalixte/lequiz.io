import React from "react";

const GameMode = ({gameMode, pickGameMode, color}) => {
   const {label, description, allowed} = gameMode;
    return (
        <button className={`game-mode ${color}`} onClick={() => pickGameMode(gameMode)} disabled={!allowed}>
            <p className="game-mode-label">{label}</p>
            <p className="game-mode-description">{description}</p>
        </button>
    );
}

export default GameMode;