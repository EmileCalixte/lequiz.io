import React from "react";
import {Link, Redirect} from "react-router-dom";
import {app} from "../../App";
import Util from "../../../util/Util";

import AuthUtil from "../../../util/AuthUtil";
import ApiUtil from "../../../util/ApiUtil";
import UserAccessUtil from "../../../util/UserAccessUtil";
import {ON_CLICK_GO_BACK} from "../../misc/BackArrow";

class Register extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            redirect: false,
            formErrors: {},
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
                <h1 className="mb">Inscription</h1>
                <p className="mb2">Vous avez déjà un compte ? <Link to="/login">Connectez-vous</Link></p>
                <form id="register-form" onSubmit={this.onRegisterFormSubmit}>
                    <div className="mb3 mt3">
                        <input className={"full-width" + (this.state.formErrors.username ? ' error' : '')} id="username-input" name="username" placeholder="Nom d'utilisateur" autoFocus autoComplete="username"/>
                    </div>
                    <div className="mb3">
                        <input className={"full-width" + (this.state.formErrors.email ? ' error' : '')} id="email-input" type="email" name="email" placeholder="Adresse email" autoComplete="email"/>
                    </div>
                    <div className="mb3">
                        <input className={"full-width" + (this.state.formErrors.password ? ' error' : '')} id="password-input" type="password" name="password" placeholder="Mot de passe" autoComplete="new-password"/>
                    </div>
                    <div className="mb3">
                        <input className={"full-width" + (this.state.formErrors.confirmPassword ? ' error' : '')} id="confirm-password-input" type="password" name="confirmPassword" placeholder="Confirmez votre mot de passe" autoComplete="new-password"/>
                    </div>
                    <div className="mb3 text-left">
                        <label className="checkbox">
                            <input type="checkbox" id="stay-logged-in-checkbox" name="stayLoggedIn"/>
                            <span>Rester connecté</span>
                        </label>
                    </div>

                    <button type="submit" className="button green mb3">Inscription</button>
                </form>
            </div>
        )
    }

    onRegisterFormSubmit = async (e) => {
        e.preventDefault();

        // TODO make an automatic form serialization function in Util.js ?

        const username = document.getElementById('username-input').value;
        const email = document.getElementById('email-input').value
        const password = document.getElementById('password-input').value;
        const confirmPassword = document.getElementById('confirm-password-input').value;
        const stayLoggedIn =  document.getElementById('stay-logged-in-checkbox').checked;

        const response = await ApiUtil.sendJsonToAPI('/auth/register', {
            username,
            email,
            password,
            confirmPassword,
            stayLoggedIn,
        });

        const responseJson = await response.json();

        switch(response.status) {
            case 201:
                Util.verbose('Register successful');
                AuthUtil.setAccesstoken(responseJson.accessToken);
                AuthUtil.setRefreshToken(responseJson.refreshToken);

                app.setUser(AuthUtil.accessTokenPayload.user);

                this.setState({
                    redirect: true,
                })

                app.toastr.success('Bienvenue sur LeQuiz.io !');

                break;
            case 422:
                this.handleErrors(responseJson.message);
                break;
            default:
                app.toastr.error('Une erreur inconnue est survenue');
                break;
        }
    }

    handleErrors = (errors) => {
        const state = this.state;
        state.formErrors = errors;
        this.setState(state);

        for(const field in this.state.formErrors) {
            app.toastr.error(this.state.formErrors[field]);
        }
    }
}

export default Register;
