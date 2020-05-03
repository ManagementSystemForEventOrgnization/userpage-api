const mongoose = require('mongoose');
const ApplyEvent = mongoose.model('applyEvent');


module.exports = {
    joinEvent: async (req, res, next) => {
        if (typeof req.body.eventid === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { eventid, time } = req.body;
        let userId = req.body.userId; // req.user;
    },

    verifyEventMember: async (req, res, next) => {
        if (typeof req.body.eventid === 'undefined' || 
            typeof req.body.joinUserId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventid } = req.body;
        let userId = req.body.userId; // req.user;
    },

    rejectEventMenber: async (req, res, next) => {
        if (typeof req.body.eventid === 'undefined' || 
            typeof req.body.joinUserId === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventid } = req.body;
        let userId = req.body.userId; // req.user;
    },

    cancelEvent: async (req, res, next) => {
        if (typeof req.body.eventid === 'undefined') {
            next({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { joinUserId, eventid } = req.body;
        let userId = req.body.userId; // req.user;

        //check to refund and change status applyevent db
       
    },

    refundNoti: async (req, res, next) => {
       
    },

    rejectEventMenberNoti: async (req, res, next) => {
       
    },

    cancelJoinEventNoti: async (req, res, next) => {
       
    },
}