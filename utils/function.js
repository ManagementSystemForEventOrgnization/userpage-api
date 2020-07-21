const key = require('../config/key');
const jsonwebtoken = require('jsonwebtoken');

module.exports = {

  validateUrlWeb: (alias) => {
    var str = alias || '';
    let regex = /[^\w-_]/;
    return regex.test(str);
  },

  issueJWT: (user) => {
    const _id = user._id;

    const expiresIn = '1d';

    const payload = {
      sub: _id,
      // iat: Date.now()
    };
    const signedToken = jsonwebtoken.sign(payload, key.PRIV_KEY, { expiresIn: expiresIn });

    return {
      token: "Bearer " + signedToken,
      expires: expiresIn
    }
  },

}