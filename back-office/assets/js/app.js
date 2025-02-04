/*
 * Welcome to your app's main JavaScript file!
 *
 * We recommend including the built version of this JavaScript file
 * (and its CSS file) in your base layout (base.html.twig).
 */

// any CSS you import will output into a single css file (app.css in this case)
import '../styles/app.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
// import { Tooltip, Toast, Popover } from 'bootstrap';
import Toastr from "toastr2";
import '../styles/toastr.css';
// start the Stimulus application
import './bootstrap';

global.toastr = new Toastr();
