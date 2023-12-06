import jwt from 'jsonwebtoken';

const verifyJWT = async (req, res, next) => {
    const token = req.cookies.jwt; 

    if (!token) {
        return res.status(401).json({'message' : 'Cannot verify, log in again.'});
    }

    jwt.verify(token, process.env.REFRESH_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).json({ 'message' : 'Login/Register to get the data.', 'error': err.message });
        }
        
        next();
    });

};

export default verifyJWT;
