import "./App.css";
import { useCallback, useEffect, useMemo, useState } from "react";

function SoundButton({ name, clicks, onClick }) {
  return (
    <button
      className={`sound-button${clicks > 0 ? " has-clicks" : ""}`}
      onClick={onClick}
    >
      <p>{name}</p>
      <p>
        <small>Clicked: {clicks}</small>
      </p>
    </button>
  );
}

function App() {
  const [sounds, setSounds] = useState({});
  const [clicked, setClicked] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/static/audio_manifest.json")
      .then((resp) => resp.json())
      .then((data) => {
        const newSounds = Object.fromEntries(
          data.audio.map(({ id, name, file }) => [
            id,
            {
              id,
              name,
              audio: new Audio(
                process.env.PUBLIC_URL + `/static/audio/${file}`
              ),
            },
          ])
        );
        const newClicked = Object.fromEntries(
          Object.keys(newSounds).map((key) => [key, 0])
        );
        setSounds(newSounds);
        setClicked(newClicked);
      });
  }, [setSounds, setClicked]);
  const playSound = useCallback(
    (id) => {
      Object.values(sounds).forEach(({ audio }) => {
        if (!audio.paused) {
          audio.load();
        }
      });
      sounds[id].audio.play();
      setClicked({ ...clicked, [id]: clicked[id] + 1 });
    },
    [sounds, clicked, setClicked]
  );
  const sortedFilteredSounds = useMemo(() => {
    return Object.entries(sounds)
      .sort(([idA], [idB]) => {
        const clickedB = clicked[idB];
        const clickedA = clicked[idA];
        if (clickedB > 0 && clickedA > 0) return 0;
        if (clickedB === 0 && clickedA === 0) return 0;
        if (clickedB > 0) return 1;
        if (clickedA > 0) return -1;
      })
      .filter(
        ([_, { name }]) =>
          searchTerm.length < 2 ||
          name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [sounds, clicked, searchTerm]);
  return (
    <div className="app">
      <div className="content">
        <h1>Biboo Soundboard</h1>
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Search"
            value={searchTerm}
            onChange={(ev) => setSearchTerm(ev.target.value)}
          />
        </div>
        <div className="sound-wrapper">
          {sortedFilteredSounds.map(([id, { name }]) => (
            <SoundButton
              key={id}
              name={name}
              clicks={clicked[id]}
              onClick={() => playSound(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
