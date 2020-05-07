
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
            return next({ error: { message: 'Thông tin chưa đúng kiểm trả lại', code: 602 } });
        }
        let userId = req.user;
        
        if (myFunction.validateUrlWeb(urlWeb)) {
            return next({ error: { message: 'Địa chỉ đường dẫn chứa kí tự không hợp lệ', code: 422 } });
        }
        console.log(urlWeb);
        let checkURL = await Event.findOne({ urlWeb });
        console.log(checkURL);
        if (checkURL) {
            next({ error: { message: 'Địa chỉ này đã được dùng', code: 402 } });
            return;
        }

        let e = new Event(
            {
                userId: userId,
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
                return next({ error: { message: 'Lỗi dữ liệu không thể lưu! vui lòng kiểm tra lại!', code: 505 } });
            }
            res.status(200).json({ result: event });
        } catch (error) {
            next({ error: { message: 'Lưu dữ liệu không thành công', code: 500 } });
        }
    },

    savePageEvent: async (req, res, next) => {
        let { block, eventId } = req.body;
        try {
            let pageEvent = await PageEvent.find({ eventId });
            if (pageEvent) {
                // xác nhận là đã lưu trước đó. chỉ cần update lại.
                let _id = pageEvent._id;
                let p = await PageEvent.findByIdAndUpdate({ _id }, { rows: block, updateAt: new Date() });
                if (!p) {
                    return next({ error: { message: 'Lỗi sự kiện không tồn tại', code: 422 } });
                }
            } else {
                let page = new PageEvent(
                    {
                        rows: block
                    }
                );
                let p = await page.save();
                if (!p) {
                    return next({ error: { message: 'Lưu không thành công', code: 422 } });
                }
                res.json(200).json({ result: 'success' })
            }
        } catch (err) {
            return next({ error: { message: 'Lưu không thành công', code: 500 } });

        }

    },

    getPageEvent: async (req, res, next) => {
        let { eventId } = req.query;

        try {
            let page = await PageEvent.find({eventId: eventId});

            if (!page) {
                return next({ error: { message: 'Sự kiện không tồn tại', code: 500 } });
            }

            res.status(200).json({ result: page });
        } catch (err) {
            next({ error: { message: 'Lỗi không lấy được dữ liệu', code: 500 } });
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