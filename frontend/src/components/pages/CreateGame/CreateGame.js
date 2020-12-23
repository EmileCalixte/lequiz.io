import React from "react";
import Util from "../../../util/Util";
import GameUtil from "../../../util/GameUtil";
import ChooseGameMode from "./views/ChooseGameMode";
import ChooseCategories from "./views/ChooseCategories";
import ChooseOptions from "./views/ChooseOptions";
import Loader from "../../misc/Loader";

export default class CreateGame extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            display: {
                gameMode: false,
                categories: false,
                options: false,
            },
            isLoading: true,
        };
    }

    componentDidMount() {
        if (this.props.fromRoom) {
            this.setState(this.props.generatedState);

        } else {
            this.setState({
                display: {
                    gameMode: true,
                    categories: false,
                    options: false,
                },
                isLoading: false,
            });

            const gameConfiguration = this.createGameConfiguration();
            Util.addObjectToSessionStorage(GameUtil.GAME_CONFIGURATION.key, gameConfiguration);
        }
    }

    createGameConfiguration = () => {
        return {
            gameMode: '',
            categories: [],
            questionTypes: [],
            winCriterion: '',
            difficulty: null,
            roomCode: false,
        }
    };

    submitGameMode = (gameMode) => {
        const gameConfiguration = Util.getObjectFromSessionStorage(GameUtil.GAME_CONFIGURATION.key);
        gameConfiguration.gameMode = gameMode;
        Util.addObjectToSessionStorage(GameUtil.GAME_CONFIGURATION.key, gameConfiguration);

        if (!this.props.fromRoom) {
            this.setState({
                display: {
                    gameMode: false,
                    categories: true,
                    options: false
                }
            })
        } else {

            this.props.roomInstance.setState({
                display: {
                    lobby: true,
                    question: false,
                    answer: false,
                    gameOptions: false,
                },
                gameConfiguration
            });

            this.props.roomInstance.socket.updateGameConfiguration(this.props.roomInstance.roomId)
        }


    };

    submitCategories = (categories) => {
        const gameConfiguration = Util.getObjectFromSessionStorage(GameUtil.GAME_CONFIGURATION.key);
        gameConfiguration.categories = categories;
        Util.addObjectToSessionStorage(GameUtil.GAME_CONFIGURATION.key, gameConfiguration);

        if (!this.props.fromRoom) {
            this.setState({
                display: {
                    gameMode: false,
                    categories: false,
                    options: true,
                }
            })
        } else {
            this.props.roomInstance.setState({
                display: {
                    lobby: true,
                    question: false,
                    answer: false,
                    gameOptions: false,
                },
                gameConfiguration
            });

            this.props.roomInstance.socket.updateGameConfiguration(this.props.roomInstance.roomId)
        }
    };

    submitOptions = (questionTypes, winCriterionValue, roomCode) => {
        const gameConfiguration = Util.getObjectFromSessionStorage(GameUtil.GAME_CONFIGURATION.key);
        gameConfiguration.winCriterion = winCriterionValue;
        gameConfiguration.questionTypes = questionTypes;
        gameConfiguration.roomCode = roomCode;

        if (!this.props.fromRoom) {

            Util.addObjectToSessionStorage(GameUtil.GAME_CONFIGURATION.key, gameConfiguration);

            this.props.history.push(`/room/${roomCode}`);

        } else {

            delete gameConfiguration.roomCode;
            Util.addObjectToSessionStorage(GameUtil.GAME_CONFIGURATION.key, gameConfiguration);

            this.props.roomInstance.setState({
                display: {
                    lobby: true,
                    question: false,
                    answer: false,
                    gameOptions: false,
                },
                gameConfiguration
            });

            this.props.roomInstance.socket.updateGameConfiguration(this.props.roomInstance.roomId)

        }
    };

    goBack = (page) => {
        switch (page) {
            case 'chooseGameMode':

                if (!this.props.fromRoom) {
                    this.props.history.replace('/');
                } else {
                    this.props.roomInstance.setState({
                        display: {
                            lobby: true,
                            question: false,
                            answer: false,
                            gameOptions: false,
                        }})
                }

                break;
            case 'chooseCategories':

                if (!this.props.fromRoom) {
                    this.setState({
                        display: {
                            gameMode: true,
                            categories: false,
                            options: false,
                        }

                    })
                } else {
                    this.props.roomInstance.setState({
                        display: {
                            lobby: true,
                            question: false,
                            answer: false,
                            gameOptions: false,
                        }})
                }
                break;
            case 'chooseOptions':

                if (!this.props.fromRoom) {
                    this.setState({
                        display: {
                            gameMode: false,
                            categories: true,
                            options: false,
                        }

                    })
                } else {
                    this.props.roomInstance.setState({
                        display: {
                            lobby: true,
                            question: false,
                            answer: false,
                            gameOptions: false,
                        }})
                }
                break;
        }
    }

    componentWillUnmount() {

    }

    render() {

        const { display, isLoading } = this.state;

        if (isLoading) {
            return (
                <>
                    <div className="app loading">
                        <div className="app-loader">
                            <Loader width="max(6vw, 80px)"/>
                        </div>
                    </div>
                </>
            );
        }


        if (display.gameMode) {

            return(<ChooseGameMode submit={this.submitGameMode} goBack={this.goBack}/>)

        } else if (display.categories) {

            return(<ChooseCategories submit={this.submitCategories} goBack={this.goBack}/>)

        } else if (display.options) {

            return(<ChooseOptions submit={this.submitOptions} goBack={this.goBack}/>)

        }
    }
}
