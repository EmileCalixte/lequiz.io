const nodemailer = require('nodemailer');
const env = require('../config/env');

class Util {
    static Email = {
        FROM_NAME: 'LeQuiz.io',
        FROM_NOREPLY_ADDRESS: 'noreply@lequiz.io',

        transport: null, // Initialized by createTransport function

        createTransport: () => {
            const transport = nodemailer.createTransport(env.email);

            console.log('Verifying email transport');
            transport.verify((error, success) => {
                if (error) {
                    throw new Error(error);
                } else {
                    console.log('Email transport is ready');
                }
            });

            return transport;
        },

        /**
         * @param {string} email
         * @return {boolean}
         */
        isEmailAddressValid: (email) => {
            if(email.length > 191) {
                return false;
            }

            const regex = "^(([^<>()\\[\\]\\\\.,;:\\s@\"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@\"]+)*)|(\".+\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$";
            return !!email.match(regex);
        },

        /**
         * @param {object} message The message options
         * @param {string} message.from The sender
         * @param {string} message.to The recipients, comma-separated
         * @param {string} message.subject The email subject
         * @param {string} message.text The email text content
         * @param {string} message.html The email html content
         * @param message
         * @return {Promise}
         */
        sendEmail: (message = {}) => {
            return new Promise((resolve, reject) => {
                Util.Email.transport.sendMail(message, (error, info) => {
                    if (error) {
                        reject(error);
                    }

                    resolve(info);
                });
            });

            // await sendgrid.send(message);
        },

        /**
         *
         * @param {object} message The message options
         * @param {string} message.to The recipients, comma-separated
         * @param {string} message.subject The email subject
         * @param {string} message.text The email text content
         * @param {string} message.html The email html content
         * @returns {Promise}
         */
        sendEmailFromNoreply: async(message = {}) => {
            message.from = `"${Util.Email.FROM_NAME}" <${Util.Email.FROM_NOREPLY_ADDRESS}>`;

            return await Util.Email.sendEmail(message);
        },
    };

    static Random = {

        getRandomString: (characters = Util.Random.RANDOM_ALPHANUMERIC_ALL_CASE, length = 32) => {
            // We don't use an empty string populated with "+=" in the for loop because it have O(n^2) performance.
            // Creating a characters array and join them at the end is better.

            const outputCharacters = [];

            for(let i = 0; i < length; ++i) {
                outputCharacters.push(characters.charAt(Math.floor(Math.random() * characters.length)));
            }

            return outputCharacters.join('');
        },
    };
}

Util.Email.transport = Util.Email.createTransport();

Util.Random.RANDOM_LETTERS_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
Util.Random.RANDOM_LETTERS_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
Util.Random.RANDOM_LETTERS_ALL_CASE = Util.Random.RANDOM_LETTERS_LOWERCASE + Util.Random.RANDOM_LETTERS_UPPERCASE;
Util.Random.RANDOM_DIGITS = '0123456789';
Util.Random.RANDOM_ALPHANUMERIC_ALL_CASE = Util.Random.RANDOM_LETTERS_ALL_CASE + Util.Random.RANDOM_DIGITS;


module.exports = Util;
