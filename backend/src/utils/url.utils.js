const getFrontendUrl = () => {
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL.replace(/\/+$/, "");
    }
    if (process.env.NODE_ENV === "production") {
        return "https://vardhan-lime.vercel.app";
    }
    return "http://localhost:5173";
};

module.exports = {
    getFrontendUrl,
};
