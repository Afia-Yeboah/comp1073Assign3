// Switching to Auth with PCKE: Implicit Grant is deprecated
// Setting up client id and redirect uri form web api
const clientId = "c41a56045bc44c9fbaf18dbb27c4f7de";
const redirectUri = window.location.origin + window.location.pathname;

// PKCE Helpers
// From https://github.com/spotify/web-api-examples/tree/master/authorization
function makeVerifier (len = 64) {
    const possibleCode = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(array)
    .map(x => possibleCode[x % possibleCode.length])
    .join("");
}

// The url encoder for the verifier to challenge
async function makeChallenge(verifier) {
    const digest = await crypto.subtle.digest("SHA-256", 
        new TextEncoder().encode(verifier)
    );
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

//Once page loads, login handle
;(async function authenticate() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const storedToken = sessionStorage.getItem("sessionToken");

    // if there's a token, return nothing
    if (storedToken) return;

    if (code) {
        await fetchAccessToken(code);
        return;
        
    }

    // Begin the auth process
    startAuth()
})();

// refer user to spotify's auth using the challenge
async function startAuth() {
    // begin the PKCE login
    const verifier = makeVerifier();
    const challenge = await makeChallenge(verifier);
    sessionStorage.setItem("sessionVerifier", verifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", challenge);

    window.location = authUrl;
};


// Function to fetch the access token
async function fetchAccessToken(code) {
    const verifier = sessionStorage.getItem("sessionVerifier");
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier
    });

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body
    });

    if (!res.ok) {
        console.error("Token failed:", await res.text());
        return;
    }

    const {access_token} = await res.json();
    sessionStorage.setItem("sessionToken", access_token);

    window.history.replaceState({}, "", redirectUri);
};

// set up helper for the stored token
function getAccessToken() {
    const token = sessionStorage.getItem("sessionToken");
    if (!token) throw new Error("You're not authenticated! Please try again");
    return token;
};

// Call the search endpooint for the artist
async function searchArtist(name) {
    const token = getAccessToken();
    const authHeader = { Authorization: `Bearer ${token}` };
    // using the search api url
    const searchUrl = `https://api.spotify.com/v1/search`
                     + `?q=${encodeURIComponent(name)}`
                     + `&type=artist&limit=1`;

const searchResponse = await fetch(searchUrl, {headers: authHeader});

if (!searchResponse.ok) {
    console.error(
        "Artist search failed:", 
        await searchResponse.text()
    );
    return null
}

//Parse the json response
const searchData = await searchResponse.json();

// Return the artist
return searchData.artists.items[0] || null;
}


// Get the top 5 tracks of the artist using their id
async function fetchTopTracks(artistId) {
    const token = getAccessToken();
    const authHeader = { Authorization: `Bearer ${token}`};
    // Using the track endpoint
    const tracksUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`;

    const topTracksRes = await fetch(tracksUrl, {headers: authHeader});
    if (!topTracksRes.ok) {
        console.error("Top-tracks failed:", await topTracksRes.text());
        return [];
    }

    // Parse the Json res
    const topTracksData = await topTracksRes.json();

    // return the top 5 tracks
    return topTracksData.tracks.slice(0, 5);
};

// Rendering the artist info along with
// their top 5 tracks as well
function renderArtistTracks(artist, tracks) {
    const container = document.getElementById("output");
    container.innerHTML = "";

    // if no artist is found- display a msg
    if (!artist) {
        container.textContent = "No artist found! please try again!";
        return;
    };

    const artistName = document.createElement("h2");
    artistName.textContent = artist.name;
    container.appendChild(artistName);

    const infoBox = document.createElement("div");
    infoBox.classList.add("artist-info");

    const artistImage = artist.images[0]?.url;
    if (artistImage) {
        const image = document.createElement("img");
        image.src = artistImage;
        image.alt = artist.name;
        image.width = 150;
        container.appendChild(image);
    };

    const details = document.createElement("div");
    details.classList.add("artist-details");

    // Artist Follower count
    const followers = document.createElement("p");
    followers.textContent = `Followers: ${artist.followers.total.toLocaleString()}`;
    container.appendChild(followers);

    // Genre of songs artist is in
    const genres = document.createElement("p");
    genres.textContent = "Genres: " + (artist.genres.join(", ") || "N/A");
    container.appendChild(genres);

    infoBox.appendChild(details);
    container.appendChild(infoBox);

    // Music tracks heading
    const musicTracks = document.createElement("h3");
    musicTracks.textContent = "Top Tracks";
    container.appendChild(musicTracks);

    // Top Tracks List
    const tracksList = document.createElement("ol");
    tracks.forEach(track => {
        const trackItem = document.createElement("li");
        trackItem.textContent = track.name;
        tracksList.appendChild(trackItem);
    });

    container.appendChild(tracksList);
}

// setting up the search button
// fetch the artist + song tracks and render to page
document.getElementById("searchBtn").onclick = async () => {
    const query = document.getElementById("artistInput").value.trim();
    if (!query) return;

    // Show a msg while user wait eg. loading srtist
document.getElementById("output").textContent = "Loading artist info...";

try {
    const artist = await searchArtist(query);
    const topTracks = artist ? await fetchTopTracks(artist.id) : [];
    renderArtistTracks(artist, topTracks);
} catch (err) {
    console.error(err);
    document.getElementById("output").textContent = "Error occured!";
}
};

