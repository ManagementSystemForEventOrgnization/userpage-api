const moment = require('moment');

module.exports = {
    formatDate: (date) => {
        let locale = 'en'
        let type = '+0700'
        moment.locale(locale);
        var dateStart = moment(date).utcOffset(type);

        return dateStart.calendar()

        //add more 
    }
}