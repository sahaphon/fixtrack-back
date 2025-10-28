const crypto = require("crypto");
const db = require("../db");
const { ExecuteSQL, ExCRUD, ExCRUD_V2 } = require("../db");

const genRandomString = (length) => {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString("hex") /** convert to hexadecimal format */
        .slice(0, length); /** return required number of characters */
};

const hashPassword = (password, salt) => {
    return crypto.createHmac("sha256", salt).update(password).digest("hex");
};

const authenticated = async (req, res, next) => {
    const authToken = req.headers.authorization;
    if (authToken === undefined || authToken === "null" || !authToken) {
        return res.send({
            success: false,
            message: "token is required",
            response: {
                status: "failed",
                err: "token is required",
            },
        });
    }

    const db = new ExecuteSQL(res);

    const [userID, token] = authToken.split(":");
    let strSql = `SELECT token FROM registered WHERE emp_id = '${userID}' AND token ='${token}' `;
    const result = await db.executeSQL(strSql);

    if (result.status === "failed") {
        return res.send({ success: true, message: "", response: result });
    }

    if (result.length !== 0) {
        // 12 ชั่วโมง = 43,200 วินาที
        strSql = `SELECT token FROM registered 
                    WHERE emp_id = '${userID}' 
                    AND token ='${token}' 
                    AND DATEDIFF(ss, last_login , GETDATE()) <= 43200`;

        const checkSecond = await db.executeSQL(strSql);

        if (checkSecond.length !== 0) {
            next();
        } else {
            return res.send({
                success: false,
                message: "Token expired.",
                response: {
                    status: "failed",
                    err: "token expire",
                },
            });
        }
    } else {
        return res.send({
            success: false,
            message: "You are not authenticated",
            response: {
                status: "failed",
                err: "you are not authenticated",
            },
        });
    }
};

module.exports = {
    genRandomString,
    hashPassword,
    authenticated,
};
