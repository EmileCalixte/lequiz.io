import { Controller } from "stimulus";
import Util from "./util_controller";

export default class extends Controller {

    ENTITY_NAME = 'question-types';
    BLOCK_TO_REPLACE = '#questionTypes-block';
    page;
    timer;

    filters = {
        search: '',
        uuid: '',
    }

    initialize = () => {
        this.page = parseInt(Util.getQueryStringParam('page', 1, 'number'));

        const paramsInUrl = Util.getQueryStringParams();
        Util.fillFilterInputs(paramsInUrl, this.filters);
    }

    onInput = (evt) => {
        Util.onFormInput(this.timer, this.filters, this.ENTITY_NAME, this.BLOCK_TO_REPLACE, evt);
    }

    onUniqueCheckboxChange = async (evt) => {
        await Util.onUniqueCheckboxChange(this.filters, this.ENTITY_NAME, this.BLOCK_TO_REPLACE, evt);
    }

    //TODO IN V2 : What Happens when type has questions related to itself
    deleteQuestionType = async (evt) => {
        const uuid = evt.currentTarget.getAttribute('data-uuid');
        await Util.deleteEntity(this.ENTITY_NAME, uuid);
    }

}
