module.exports = {

    validateUrlWeb:(alias)=> {
        var str = alias || '';
        let regex = /[^\w-_]/;
        return regex.test(str);
    }
}