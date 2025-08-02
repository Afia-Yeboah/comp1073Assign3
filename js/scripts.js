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

// Search artist name
async function searchArtist(name) {
    // redirect user to login if they don't have a token
    if (!spotifyToken) {
        login();
        return null;
    }

    // Building the spotify search api url
    const url = `https://api.spotify.com/v1/search?` +
    `q=${encodeURIComponent(name)}` +
    `&type=artist&limit=1`;

    // Call the API with token
    const res = await fetch(url, {
        headers: { 
            "Authorization": `Bearer ${spotifyToken}`
        }
    });

    // Parse the Json response
    const data = await res.json();
    
    // Return the artist
    return data.artists.items[0];
}

// Get the top 5 tracks of the artist using their id
async function getTopTracks(artistId) {
    // send user to login if there'rs no token yet
    if (!spotifyToken) {
        login();
        return [];
    }

    // Building the spotify top tracks with the api url
    const url = `https://api.spotify.com/v1/artists/{id}/top-tracks?market=CA`;

    // Call API
    const res = await fetch(url, {
        headers: {
            "Authorization":`Bearer ${spotifyToken}`
        }
    });

    // Parse the JSON res
    const data = await res.json();

    // Return the top 5 tracks array
    return data.tracks.slice(0, 5);
}