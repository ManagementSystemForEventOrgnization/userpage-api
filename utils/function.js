module.exports = {

    validateUrlWeb:(alias)=> {
        var str = alias || '';
        let regex = /[^\w-]]/;
        return regex.test(str);
    }
}