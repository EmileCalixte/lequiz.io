import React from "react";

const BackArrow = ({onClick}) => {
        return (
                <button onClick={() => onClick()} className="game-mode-btn-precedent">
                        <svg className="game-mode-btn-precedent-svg" x="0px" y="0px" height="40" width="40" viewBox="0 0 512.2 512.2">
                                <path d="M3.1,264l213.5,212.8c3.1,3,7.6,3.9,11.6,2.3c4-1.7,6.6-5.5,6.6-9.9V351.9h266.7c5.9,0,10.7-4.8,10.7-10.7V169.8
                                c0-5.5-4.5-9.9-9.9-9.9H237c-1.2,0-2.1-1-2.1-2.1V43c0-4.3-2.6-8.2-6.6-9.9c-1.3-0.6-2.7-0.8-4.1-0.8c-2.8,0-5.5,1.1-7.6,3.1
                                L3.1,248.9c-2,2-3.1,4.7-3.1,7.6C0,259.2,1.1,262,3.1,264z"/>
                        </svg>
                </button>
        )
};

export default BackArrow;
