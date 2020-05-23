module.exports = {

    validateUrlWeb:(alias)=> {
        var str = alias || '';
        let regex = /[^\w-_]/;
        return regex.test(str);
    },

    // call when all api success and result is array
    funcPromiseAll: (arr)=>{
        return new Promise((resolve, reject)=>{
            Promise.all([...arr])
            .then((val)=>resolve(val))
            .catch(e=>reject(e))
        })
    },
    // call when 1api success
    funcPromiseRace: (arr)=>{
        return new Promise((resolve,reject)=>{
            Promise.race([...arr])
            .then(val=>resolve(val))
            .catch(err=> reject(err));
        })
    }
    
}