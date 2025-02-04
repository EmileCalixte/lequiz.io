import React from "react";
import {Link, Redirect} from "react-router-dom";
import Util from "../../../util/Util";
import {app} from "../../App";

import AuthUtil from "../../../util/AuthUtil";
import ApiUtil from "../../../util/ApiUtil";
import UserAccessUtil from "../../../util/UserAccessUtil";
import {ON_CLICK_GO_BACK} from "../../misc/BackArrow";

class Login extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            redirect: false,
        }

        UserAccessUtil.componentRequiresRole(UserAccessUtil.ROLES.GUEST_ONLY);
    }

    componentDidMount() {
        app.showBackArrow(true, ON_CLICK_GO_BACK);
    }

    render = () => {
        if(this.state.redirect) {
            return(
                <Redirect to="/"/>
            )
        }

        return(
                <div className="text-center">
                    <h1 className="mb">Connexion</h1>
                    <p className="mb2">Vous n'avez pas encore de compte ? <Link to="/register">Inscrivez-vous</Link></p>
                    <form id="login-form" onSubmit={this.onLoginFormSubmit}>
                        <div className="mb3 mt3">
                            <input className="full-width" id="username-input" name="username" placeholder="Nom d'utilisateur ou adresse email" autoFocus autoComplete="username" required/>
                        </div>
                        <div className="mb3">
                            <input className="full-width" id="password-input" type="password" name="password" placeholder="Mot de passe" autoComplete="current-password" required/>
                        </div>
                        <div className="mb3 text-left">
                            <label className="checkbox">
                                <input type="checkbox" id="stay-logged-in-checkbox" name="stayLoggedIn"/>
                                <span>Rester connecté</span>
                            </label>
                        </div>
                        <button type="submit" className="button green mb2">Connexion</button>
                    </form>
                    <small><Link to="/forgot-password">Mot de passe oublié ?</Link></small>
                </div>
        )
    }

    onLoginFormSubmit = async (e) => {
        e.preventDefault();

        // TODO make an automatic form serialization function in Util.js ?

        const username = document.getElementById('username-input').value;
        const password = document.getElementById('password-input').value;
        const stayLoggedIn =  document.getElementById('stay-logged-in-checkbox').checked;

        const response = await ApiUtil.sendJsonToAPI('/auth/login', {
            username,
            password,
            stayLoggedIn,
        });

        const responseJson = await response.json()

        switch(response.status) {
            case 200:
                Util.verbose('Login successful');
                AuthUtil.setAccesstoken(responseJson.accessToken);
                AuthUtil.setRefreshToken(responseJson.refreshToken);

                app.setUser(AuthUtil.accessTokenPayload.user);

                this.setState({
                    redirect: true,
                })
                break;
            case 403:
                //TODO banni jusqu'à ?
                app.toastr.error("Vous avez été banni");
                break;
            case 404:
                app.toastr.error('Ces identifiants sont incorrects');
                break;
            default:
                app.toastr.error('Une erreur inconnue est survenue');
                break;
        }
    }
}

export default Login;
