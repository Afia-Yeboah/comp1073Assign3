// Setting up client id and redirect uri form web api
const clientId = "c41a56045bc44c9fbaf18dbb27c4f7de";
const redirectUri = window.location.origin;

// Function to redirect user to Spotify's login for token
function login() {
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    window.location = authUrl.toString();
};

// Function to parse the access token from the URL
function getToken() {
    const hash = window.location.hash.substring(1); // this is to remove the # symbol when the url is retrieved from spotify
    const params = new URLSearchParams(hash);
    return params.get("acess_token");
};

// Check URL for token
let spotifyToken = sessionStorage.getItem("spotifyToken");
if (!spotifyToken) {
    const token = getToken();

    if (token) {
        sessionStorage.setItem("spotifyToken", token);
        spotifyToken = token;
    }
}