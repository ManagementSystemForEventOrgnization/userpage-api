
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model('users');
const myFunction = require('../utils/function');
const Event = mongoose.model('event');
const PageEvent = mongoose.model('pageEvent');

module.exports = {
    saveEvent: async (req, res, next) => {
        let { name, typeOfEvent, category, urlWeb, limitNumber, address, detailAddress, map, startTime, endTime, isSellTicket, ticket } = req.body;
        if (typeof eventName === undefined || typeof long === undefined || typeof address === undefined) {
            return next({ error: { message: 'Invalid value', code: 602 } });
        }
        let userId = req.user;

        if (myFunction.validateUrlWeb(urlWeb)) {
            return next({ error: { message: 'URL is wrong format.', code: 422 } });
        }

        let checkURL = await Event.find({ urlWeb });
        if (checkURL.length !== 0) {
            next({ error: { message: 'URL is used', code: 402 } });
            return;
        }

        let e = new Event({
            userId,
            typeOfEvent,
            name,
            limitNumber,
            category,
            ticket,
            address,
            urlWeb,
            detailAddress,
            map,
            startTime,
            endTime,
            isSellTicket
        }
        );

        try {
            let event = await e.save();
            if (!event) {
                return next({ error: { message: 'Invalid data, can\'t save data', code: 505 } });
            }
            res.status(200).json({ result: event });
        } catch (error) {
            next({ error: { message: error, code: 500 } })
        }
    },


    savePageEvent: async (req, res, next) => {
        let { block, eventId } = req.body;
        console.log(block);
        try {
            eventId = eventId || '';
            let pageEvent = await PageEvent.find({ eventId });
            if (pageEvent[0]) {
                // xác nhận là đã lưu trước đó. chỉ cần update lại.
                let _id = pageEvent[0]._id;
                let p = await PageEvent.findByIdAndUpdate({ _id: ObjectId(_id) }, { rows: block, updateAt: new Date() });
                if (!p) {
                    return next({ error: { message: 'Event is not exists', code: 422 } });
                }
            } else {
                let page = new PageEvent(
                    {
                        eventId : eventId,
                        rows: block
                    }
                );
                let p = await page.save();
                if (!p) {
                    return next({ error: { message: 'Invalid data, can\' save data', code: 422 } });
                }
            }
            res.status(200).json({ result: 'success' })

        } catch (err) {
            next({ error: { message: err, code: 500 } })

        }
    },

    getPageEvent: async (req, res, next) => {
        let { eventId } = req.query;

        try {
            if(!eventId){
                return next({error: {message: 'Event is not exists', code: 422}});
            }
            let page = await PageEvent.find({ eventId: new ObjectId(eventId) });

            if (!page) {
                return next({ error: { message: 'Event is not exists', code: 500 } });
            }
            res.status(200).json({ result: page });
        } catch (err) {
            next({ error: { message: err, code: 500 } })
        }

    },

    getListEvent: async (req, res, next) => {
        try {
            let events = await Event.find();

            res.status(200).json({ result: events });
        } catch (err) {
            next({ error: { message: 'Lỗi không lấy được dữ liệu', code: 500 } });
        }
    }
}