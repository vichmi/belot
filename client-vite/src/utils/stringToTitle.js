const stringToTitle = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default stringToTitle;