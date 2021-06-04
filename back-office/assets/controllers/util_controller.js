import * as url from "url";

class Util {


    static getParam = (paramName, defaultValue, type) => {

        const queryString = window.location.search;

        if (!queryString) return defaultValue

        const searchParams = new URLSearchParams(queryString)

        const param = searchParams.get(paramName);

        if (!param) return defaultValue

        if (type === 'number' && isNaN(parseInt(param))) return defaultValue;

        return param;
    }

    static addParam = (paramName, paramValue) => {

        const queryString = window.location.search;

        const searchParams = new URLSearchParams(queryString);

        searchParams.set(paramName, paramValue);

        return `${window.location.href.split('?')[0]}?${decodeURIComponent(searchParams.toString())}`;
    }

    static deleteParam = (paramName) => {

        if (typeof paramName === 'string') paramName = [paramName];

        const searchParams = new URLSearchParams(window.location.search);

        paramName.forEach(param => {
            searchParams.delete(param);
        })

        const separator = searchParams.toString() === '' ? '' : '?';

        return `${window.location.href.split('?')[0]}${separator}${decodeURIComponent(searchParams.toString())}`;
    }

    static getFilteredData = async (route, param) => {

        const headers = new Headers();
        headers.append('X-Requested-With', 'fetch');

        // if (!route.startsWith('/'))
        let urlToFetch = `/${route}`;
        console.log("param...", param);

        if (param) {
            urlToFetch += '?'

            for (const paramName in param) {
                if (param.hasOwnProperty(paramName))
                    urlToFetch += `${paramName}=${param[paramName]}&`;
            }
            urlToFetch = urlToFetch.slice(0, urlToFetch.length -1);
        }

        console.log("final URL To Fetch", urlToFetch);

        const response = await fetch(urlToFetch, {headers});

        if (!response.ok) throw new Error();

        return await response.text();

    }
}

export default Util;
