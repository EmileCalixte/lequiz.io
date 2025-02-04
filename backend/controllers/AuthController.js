const argon2 = require('argon2');
const fetch = require('node-fetch');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
const { Op, QueryTypes } = require('sequelize');
const EmailUtil = require("../util/EmailUtil");
const InvalidTokenTypeError = require('../errors/auth/token/InvalidTokenTypeError');
const MainController = require('./mainController/MainController');
const PasswordUtil = require("../util/PasswordUtil");
const RandomUtil = require("../util/RandomUtil");
const env = require('../config/env');
const NotYetValidTokenError = require("../errors/auth/token/NotYetValidTokenError");
const ExpiredTokenError = require("../errors/auth/token/ExpiredTokenError");
const MalformedTokenError = require("../errors/auth/token/MalformedTokenError");
const InternalServerError = require("../errors/base/InternalServerError");
const DatabaseError = require("../errors/misc/DatabaseError");
const UnknownRefreshTokenError = require("../errors/auth/token/UnknownRefreshTokenError");
const InvalidRefreshTokenError = require("../errors/auth/token/InvalidRefreshTokenError");
const UserNotFoundByTokenError = require("../errors/auth/token/UserNotFoundByTokenError");
const MissingParametersError = require("../errors/misc/MissingParametersError");
const InvalidEmailError = require("../errors/auth/email/InvalidEmailError");
const AlreadyUsedEmailError = require("../errors/auth/email/AlreadyUsedEmailError");
const AlreadyUsedUsernameError = require("../errors/auth/username/AlreadyUsedUsernameError");
const InvalidUsernameError = require("../errors/auth/username/InvalidUsernameError");
const TooLongUsernameError = require("../errors/auth/username/TooLongUsernameError");
const TooShortPasswordError = require("../errors/auth/password/TooShortPasswordError");
const NotMatchingPasswordsError = require("../errors/auth/password/NotMatchingPasswordsError");
const InvalidRegistrationError = require("../errors/auth/InvalidRegistrationError");
const BadCredentialsError = require("../errors/auth/BadCredentialsError");
const NotLoggedUserError = require("../errors/auth/NotLoggedUserError");
const BannedUserError = require("../errors/auth/BannedUserError");
const TooManyRequestsError = require("../errors/base/TooManyRequestsError");

class AuthController extends MainController {
    static TOKEN_TYPE_ACCESS_TOKEN = 'accessToken';
    static TOKEN_TYPE_REFRESH_TOKEN = 'refreshToken';

    static JWT_SECRET = env.jwtSecret;
    static ACCESS_TOKEN_LIFETIME = 60 * 15; // 15 minutes
    static REFRESH_TOKEN_LIFETIME = 60 * 60 * 24; // 1 day
    static REFRESH_TOKEN_LIFETIME_STAY_LOGGED_IN = 60 * 60 * 24 * 365 // 1 year

    actionVerifyToken = () => {
        // Access token is already verified in previous middleware, if we are here then the token is OK !

        this.response = {valid: true};
    }

    actionAccessToken = async (inputRefreshToken = null) => {
        let fromRefreshToken = false;
        if(inputRefreshToken !== null) {
            fromRefreshToken = true;
        }

        if(!fromRefreshToken) { // Generate new couple of blank tokens
            const accessToken = this.generateToken(AuthController.TOKEN_TYPE_ACCESS_TOKEN);
            const refreshToken = this.generateToken(AuthController.TOKEN_TYPE_REFRESH_TOKEN);

            const refreshTokenExpirationDate = new Date();
            refreshTokenExpirationDate.setTime(refreshTokenExpirationDate.getTime() + (AuthController.REFRESH_TOKEN_LIFETIME * 1000));

            await this.saveRefreshToken(refreshToken, refreshTokenExpirationDate);

            this.response = {
                'accessToken': accessToken,
                'refreshToken': refreshToken,
            };

            return;
        }

        const response = {};

        const payload = AuthController.verifyToken(inputRefreshToken, AuthController.TOKEN_TYPE_REFRESH_TOKEN);

        const records = await db.sequelize.query(
            'SELECT * FROM "refresh_token" WHERE "token" = :token',
            {
                replacements: {
                    token: inputRefreshToken,
                },
                type: QueryTypes.SELECT,
            }
        );

        if (records.length < 1) throw new UnknownRefreshTokenError();

        const dbRefreshToken = records[0];

        const refreshTokenPayload = payload;

        // Check if userId associated to refreshToken in db matches with refreshToken payload
        let userIdsMatch = true;
        if(dbRefreshToken.userId === null) {
            if(refreshTokenPayload.hasOwnProperty('user')) {
                userIdsMatch = false;
            }
        } else {
            if(refreshTokenPayload.hasOwnProperty('user')) {
                if(refreshTokenPayload.user.id !== dbRefreshToken.userId) {
                    userIdsMatch = false;
                }
            } else {
                userIdsMatch = false;
            }
        }

        if (!userIdsMatch) throw new InvalidRefreshTokenError();

        // Check if user exists
        if(payload.user) {
            const userId = payload.user.id;

            const user = await db.User.findOne({
                where: {
                    id: userId
                }
            });

            if (user === null) throw new UserNotFoundByTokenError();

            if (user.isBanned) throw new BannedUserError();
        }

        const newAccessToken = this.generateToken(AuthController.TOKEN_TYPE_ACCESS_TOKEN, refreshTokenPayload);
        const newRefreshToken = this.generateToken(AuthController.TOKEN_TYPE_REFRESH_TOKEN, refreshTokenPayload);

        await this.invalidateRefreshToken(inputRefreshToken);

        const refreshTokenExpirationDate = new Date();
        refreshTokenExpirationDate.setTime(refreshTokenExpirationDate.getTime() + (AuthController.REFRESH_TOKEN_LIFETIME * 1000));

        await this.saveRefreshToken(newRefreshToken, refreshTokenExpirationDate, dbRefreshToken.userId);

        response.accessToken = newAccessToken;
        response.refreshToken = newRefreshToken;
        this.response = response;
    }

    actionLogin = async (requestBody, accessTokenPayload) => {
        const requiredBodyFields = ['username', 'password', 'stayLoggedIn'];
        const missingFields = [];

        for(const requiredField of requiredBodyFields) {
            if(!requestBody.hasOwnProperty(requiredField)) {
                missingFields.push(requiredField);
            }
        }

        if (missingFields.length > 0) throw new MissingParametersError(missingFields.join(', '));

        const user = await db.User.findOne({
            where: {
                [Op.or]: [
                    { username: requestBody.username },
                    { email: requestBody.username },
                ],
            },
        });

        if (user === null) throw new BadCredentialsError();

        const userPasswordHash = user.password;

        if (!(await argon2.verify(userPasswordHash, requestBody.password))) throw new BadCredentialsError();

        if (user.isBanned) throw new BannedUserError();

        const currentAccessTokenPayload = {...accessTokenPayload};
        const newAccessTokenPayload = Object.assign(currentAccessTokenPayload, {
            user: {
                id: user.id,
                username: user.username,
                plan: user.plan,
                role: user.role,
            }
        });

        const refreshTokenLifetime = requestBody.stayLoggedIn
            ? AuthController.REFRESH_TOKEN_LIFETIME_STAY_LOGGED_IN
            : AuthController.REFRESH_TOKEN_LIFETIME;

        const newAccessToken = this.generateToken(AuthController.TOKEN_TYPE_ACCESS_TOKEN, newAccessTokenPayload);
        const newRefreshToken = this.generateToken(AuthController.TOKEN_TYPE_REFRESH_TOKEN, newAccessTokenPayload, refreshTokenLifetime);

        const refreshTokenExpirationDate = new Date();
        refreshTokenExpirationDate.setTime(refreshTokenExpirationDate.getTime() + (refreshTokenLifetime * 1000));

        await this.saveRefreshToken(newRefreshToken, refreshTokenExpirationDate, user.id);

        this.response = {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }
    }

    actionLogout = async (accessTokenPayload) => {
        console.log(accessTokenPayload);

        if (!accessTokenPayload.hasOwnProperty('user')) throw new NotLoggedUserError();

        if(accessTokenPayload.user.hasOwnProperty('id')) {
            await this.invalidateUserRefreshTokens(accessTokenPayload.user.id);
        }

        this.statusCode = 204;
    }

    actionRegister = async (requestBody, accessTokenPayload) => {
        const requiredBodyFields = ['username', 'email', 'password', 'confirmPassword', 'stayLoggedIn'];
        const missingFields = [];

        for(const requiredField of requiredBodyFields) {
            if(!requestBody.hasOwnProperty(requiredField)) {
                missingFields.push(requiredField);
            }
        }

        if (missingFields.length > 0) throw new MissingParametersError(missingFields.join(', '));

        const errors = {};

        const existingUserWithUsername = await db.User.findOne({
            where: {
                username: requestBody.username,
            },
        });

        if (existingUserWithUsername !== null) {
            errors.username = new AlreadyUsedUsernameError().message;
        } else if (!requestBody.username.match("^[a-zA-Z0-9_]*$")) {
            errors.username = new InvalidUsernameError().message;
        } else if (requestBody.username.length > 30) {
            errors.username = new TooLongUsernameError().message;
        }

        const existingUserWithEmail = await db.User.findOne({
            where: {
                email: requestBody.email,
            },
        });

        if (existingUserWithEmail !== null) {
            errors.email = new AlreadyUsedEmailError().message;
        } else if(!EmailUtil.isEmailAddressValid(requestBody.email)) {
            errors.email = new InvalidEmailError().message;
        }

        if (requestBody.password.length < PasswordUtil.MIN_LENGTH) {
            errors.password = new TooShortPasswordError().message;
        }

        if (requestBody.password !== requestBody.confirmPassword) {
            errors.confirmPassword = new NotMatchingPasswordsError().message;
        }

        if (Object.keys(errors).length > 0) throw new InvalidRegistrationError(errors);

        const user = await db.User.create({
            username: requestBody.username,
            email: requestBody.email,
            password: await PasswordUtil.hashPassword(requestBody.password),
            plan: 'free',
            role: 'member',
            isTrustyWriter: false,
            isActive: true,
            isBanned: false,
        });

        const currentAccessTokenPayload = {...accessTokenPayload};
        const newAccessTokenPayload = Object.assign(currentAccessTokenPayload, {
            user: {
                id: user.id,
                username: user.username,
                plan: user.plan,
                role: user.role,
            }
        });

        const refreshTokenLifetime = requestBody.stayLoggedIn
            ? AuthController.REFRESH_TOKEN_LIFETIME_STAY_LOGGED_IN
            : AuthController.REFRESH_TOKEN_LIFETIME;

        console.log(refreshTokenLifetime, requestBody.stayLoggedIn);

        const newAccessToken = this.generateToken(AuthController.TOKEN_TYPE_ACCESS_TOKEN, newAccessTokenPayload);
        const newRefreshToken = this.generateToken
        (
            AuthController.TOKEN_TYPE_REFRESH_TOKEN,
            newAccessTokenPayload, refreshTokenLifetime
        );

        const refreshTokenExpirationDate = new Date();
        refreshTokenExpirationDate.setTime(refreshTokenExpirationDate.getTime() + (refreshTokenLifetime * 1000));

        await this.saveRefreshToken(newRefreshToken, refreshTokenExpirationDate, user.id);

        this.statusCode = 201;

        this.sendWelcomeEmailToUser(user);

        this.response = {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }
    }

    actionForgotPassword = async (requestBody) => {
        const requiredBodyFields = ['username']; // We have only one field for this form, but we keep consistency with other actions
        const missingFields = [];

        for(const requiredField of requiredBodyFields) {
            if(!requestBody.hasOwnProperty(requiredField)) {
                missingFields.push(requiredField);
            }
        }

        if (missingFields.length > 0) throw new MissingParametersError(missingFields.join(', '));

        const user = await db.User.findOne({
            where: {
                [Op.or]: [
                    { username: requestBody.username },
                    { email: requestBody.username },
                ]
            }
        });

        if(user === null) throw new BadCredentialsError();

        const lastResetPasswordEmailSendDate = user.lastResetPasswordEmailSendDate;

        const now = new Date();

        if(lastResetPasswordEmailSendDate !== null) {
            const diffSeconds = (now.getTime() - user.lastResetPasswordEmailSendDate.getTime()) / 1000;

            if(diffSeconds < 300) {
                const minutesToWait = Math.ceil((300 - diffSeconds) / 60);

                throw new TooManyRequestsError
                (
                    `Veuillez patienter 
                    ${minutesToWait} minute${minutesToWait > 1 ? 's' : ''} 
                    avant de demander un nouvel email de réinitialisation.`
                );
            }
        }

        user.lastResetPasswordEmailSendDate = now;
        user.passwordResetToken = RandomUtil.getRandomString(RandomUtil.RANDOM_ALPHANUMERIC_ALL_CASE, 128);
        await user.save();

        await this.sendResetPasswordEmailToUser(user);
    }

    actionPasswordResetTokenExists = async (requestParams) => {
        const requiredBodyFields = ['passwordResetToken']; // We have only one field for this form, but we keep consistency with other actions
        const missingFields = [];

        for(const requiredField of requiredBodyFields) {
            if(!requestParams.hasOwnProperty(requiredField)) {
                missingFields.push(requiredField);
            }
        }

        if (missingFields.length > 0) throw new MissingParametersError(missingFields.join(', '));

        const user = await db.User.findOne({
            where: {
                passwordResetToken: requestParams.passwordResetToken,
            }
        });

        if (user === null) throw new BadCredentialsError('Token inexistant');

        this.statusCode = 204;
    }

    actionResetPassword = async (requestBody) => {
        const requiredBodyFields = ['newPassword', 'confirmNewPassword', 'passwordResetToken']; // We have only one field for this form, but we keep consistency with other actions
        const missingFields = [];

        for(const requiredField of requiredBodyFields) {
            if(!requestBody.hasOwnProperty(requiredField)) {
                missingFields.push(requiredField);
            }
        }

        if (missingFields.length > 0) throw new MissingParametersError(missingFields.join(', '));

        const user = await db.User.findOne({
            where: {
                passwordResetToken: requestBody.passwordResetToken,
            }
        });

        if (user === null) throw new BadCredentialsError('Token inexistant');

        if (requestBody.newPassword !== requestBody.confirmNewPassword) throw new NotMatchingPasswordsError();

        if(requestBody.newPassword.length < PasswordUtil.MIN_LENGTH) throw new TooShortPasswordError();

        user.password = await PasswordUtil.hashPassword(requestBody.newPassword);
        user.passwordResetToken = null;
        await user.save();

        this.statusCode = 204;
    }

    /**
     * Verifies a JWT token, and optionnaly its type
     * @param token string
     * @param type string|string[] (optional) if set, the token must be of that type (accessToken, refreshToken)
     * @return {{
     *     verified: boolean
     *     payload: object
     *     error: string
     * }}
     */
    static verifyToken = (token, type = null) => {
        try {
            const payload = jwt.verify(token, AuthController.JWT_SECRET);

            if(type !== null) { // Verify token type (accessToken/refreshToken)
                AuthController.verifyTokenType(payload, type);
            }

            return payload;
        } catch(e) {
            switch(e.constructor.name) {
                case 'JsonWebTokenError':
                    throw new MalformedTokenError();
                case 'TokenExpiredError':
                    throw new ExpiredTokenError();
                case 'NotBeforeError':
                    throw new NotYetValidTokenError();
                case 'InvalidTokenTypeError':
                    throw e;
                default:
                    throw new InternalServerError()
            }
        }
    }

    /**
     * Verifies the type contained in a JWT token payload
     * @param tokenPayload object
     * @param expectedTypes string|string[]
     * @throw InvalidTokenTypeError if token type does not match
     */
    static verifyTokenType = (tokenPayload, expectedTypes) => {
        if(!tokenPayload.hasOwnProperty('type')) {
            throw new InvalidTokenTypeError('Type absent du payload du token');
        }

        if(typeof expectedTypes === 'string') {
            expectedTypes = [expectedTypes];
        }

        if(!expectedTypes.includes(tokenPayload.type)) {
            throw new InvalidTokenTypeError(`Type ${tokenPayload.type} ne correspond avec aucun des types attendus (${expectedTypes.join(', ')})`);
        }
    }

    /**
     * Generates an access/refresh token, optionnally from an initial payload
     * @param type string
     * @param initialPayload object
     * @param forceLifetime if set, it will be the token lifetime. Otherwise, the lifetime will be a default value depending on the token type
     * @returns {string}
     */
    generateToken = (type, initialPayload = {}, forceLifetime = null) => {
        let expiresIn;
        if(forceLifetime) {
            expiresIn = forceLifetime;
        } else {
            switch(type) {
                case AuthController.TOKEN_TYPE_ACCESS_TOKEN:
                    expiresIn = AuthController.ACCESS_TOKEN_LIFETIME;
                    break;
                case AuthController.TOKEN_TYPE_REFRESH_TOKEN:
                    expiresIn = AuthController.REFRESH_TOKEN_LIFETIME;
                    break;
                default:
                    throw new InvalidTokenTypeError(`Type ${type} ne correspond 
                    avec aucun des types attendus (${AuthController.TOKEN_TYPE_ACCESS_TOKEN}, 
                    ${AuthController.TOKEN_TYPE_REFRESH_TOKEN})`);
            }
        }

        const payload = {...initialPayload};
        delete payload.iat;
        delete payload.exp;
        delete payload.type;
        delete payload.slt;

        payload.type = type;
        // A salt added in token payload to make it unique
        payload.slt = RandomUtil.getRandomString(RandomUtil.RANDOM_ALPHANUMERIC_ALL_CASE, 64);

        return jwt.sign(payload, AuthController.JWT_SECRET, {
            expiresIn,
        });
    }

    invalidateRefreshToken = async (refreshToken) => {
        try {
            await db.sequelize.query(
                'DELETE FROM "refresh_token" WHERE token = :token',
                {
                    replacements: {
                        token: refreshToken,
                    },
                    type: QueryTypes.DELETE,
                },
            );
        } catch (error) {
            // to log native error
            console.error(error);
            throw new DatabaseError();
        }

    }

    invalidateUserRefreshTokens = async (userId) => {
        try {
            await db.sequelize.query(
                'DELETE from "refresh_token" WHERE "userId" = :userId',
                {
                    replacements: {
                        userId,
                    },
                    type: QueryTypes.DELETE,
                },
            );
        } catch (error) {
            // to log native error
            console.error(error);
            throw new DatabaseError();
        }
    }

    saveRefreshToken = async (refreshToken, expirationDate, userId = null) => {
        try {
            await db.sequelize.query(
                'INSERT INTO "refresh_token" ("token", "userId", "expirationDate") VALUES (:token, :userId, :expirationDate)',
                {
                    replacements: {
                        token: refreshToken,
                        userId,
                        expirationDate,
                    },
                    type: QueryTypes.INSERT,
                },
            );
        } catch (error) {
            // to log native error
            console.error(error);
            throw new DatabaseError()
        }

    }

    sendResetPasswordEmailToUser = async (user) => {
        const resetPasswordUrl = `${env.frontUrl}/reset-password/${user.passwordResetToken}`

        await EmailUtil.sendResetPasswordEmail(user.email, user.username, resetPasswordUrl);
    }

    sendWelcomeEmailToUser = async (user) => {
        await EmailUtil.sendWelcomeEmail(user.email, user.username);
    }
}

module.exports = AuthController;
