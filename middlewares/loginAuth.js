module.exports = (req, res, next) => {
    // req.user chi luu id cua user login
    if (!req.user) {
        res.status(401).json({message:'Unauthorized'});
    } else {
        return next();
    }
}