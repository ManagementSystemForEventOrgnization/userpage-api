var multer = require('multer');
var fs = require('fs')
var path = require('path')
var crypto = require('crypto');

var storage = multer.diskStorage({
    destination: 'public/upload/',
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) return cb(err)
            cb(null,Date.now() + "-" + file.originalname);
        })
    }
})


var upload = multer({ storage: storage });

module.exports = function (app){

    // upload anh len server
    app.post('/api/upload' , upload.array('file', 12), function (req, res, next) {
        
        
        let arrFiles = req.files;

        let length = arrFiles.length;

        let result = [];
        for (let i = 0; i < length; i++) {
            const element = arrFiles[i];
            let {originalname : title, path : url} = element;
            url = url.replace("public", "");
            result.push({title,url});
       }

        res.status(200).json({result});
    });
    // xoa file tren server
    app.post('/api/delete_file', function (req, res, next) {
        var url_del = 'public' + req.body.url_del
        if (fs.existsSync(url_del)) {
            fs.unlinkSync(url_del)
        }
        res.redirect('back')
    });
}
