import { TwitterIcon, TwitterShareButton } from "react-share";
import "./App.css";
import { useCallback, useEffect, useMemo, useState } from "react";

const SORT = {
  CLICKS_DESC: 0,
  CLICKS_ASC: 1,
  DUR_DESC: 2,
  DUR_ASC: 3,
};

function useLocalStorage(key, initialState) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const existingStateStr = window.localStorage.getItem(key);
    if (existingStateStr === null) return;
    const existingState = JSON.parse(existingStateStr);
    setState(existingState);
  }, [key, setState]);

  const wrappedSetState = useCallback(
    (newState) => {
      window.localStorage.setItem(key, JSON.stringify(newState));
      setState(newState);
    },
    [key, setState]
  );

  return [state, wrappedSetState];
}

function SoundButton({ name, clicks, onClick, playing, duration }) {
  return (
    <button
      className={`sound-button${clicks > 0 ? " has-clicks" : ""}`}
      onClick={onClick}
    >
      <div
        className={`progress${playing ? " playing" : ""}`}
        style={playing ? { transition: `width ${duration}s linear` } : {}}
      />
      <p>{name}</p>
      <p>
        <small>Clicked: {clicks}</small>
      </p>
    </button>
  );
}

function App() {
  const [sounds, setSounds] = useState({});
  const [clicked, setClicked] = useLocalStorage("biboo_soundboard.clicked", {});
  const [playingSoundId, setPlayingSoundId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMethod, setSortMethod] = useState(null);
  const [hideGameAudio, setHideGameAudio] = useState(false);

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/static/audio_manifest.json")
      .then((resp) => resp.json())
      .then((data) => {
        const newSounds = Object.fromEntries(
          data.audio.map(({ id, name, file, gameAudio }) => {
            const newInfo = { id, name, gameAudio, audio: new Audio() };
            newInfo.audio.addEventListener(
              "loadedmetadata",
              () => {
                newInfo.duration = newInfo.audio.duration;
              },
              { once: true }
            );
            newInfo.audio.src =
              process.env.PUBLIC_URL + `/static/audio/${file}`;
            return [id, newInfo];
          })
        );
        setSounds(newSounds);
      });
  }, [setSounds]);

  useEffect(() => {
    if (
      Object.keys(sounds).reduce(
        (acc, id) => acc && clicked[id] !== undefined,
        true
      )
    )
      return;
    const newClicked = {
      ...Object.fromEntries(Object.keys(sounds).map((key) => [key, 0])),
      ...clicked,
    };
    setClicked(newClicked);
  }, [sounds, clicked, setClicked]);

  const handleSoundClick = useCallback(
    (id) => {
      const playAudio = sounds[id].audio;
      if (id === playingSoundId) {
        playAudio.load();
        setPlayingSoundId(null);
        return;
      }
      if (playingSoundId !== null) {
        sounds[playingSoundId].audio.load();
      }
      Object.values(sounds).forEach(({ audio }) => {
        if (!audio.paused) {
          audio.load();
        }
      });

      const playStartListener = () => setPlayingSoundId(id);
      const playEndListener = () => {
        playAudio.removeEventListener("loadstart", playLoadListener);
        setPlayingSoundId(null);
      };
      const playLoadListener = () => {
        playAudio.removeEventListener("ended", playEndListener);
      };

      playAudio.addEventListener("play", playStartListener, { once: true });
      playAudio.addEventListener("ended", playEndListener, { once: true });
      playAudio.addEventListener("loadstart", playLoadListener, { once: true });

      playAudio.play();
      setClicked({ ...clicked, [id]: clicked[id] + 1 });
    },
    [sounds, clicked, setClicked, playingSoundId, setPlayingSoundId]
  );

  const getSorter = useCallback(
    (newSortMethod) => {
      return (ev) => {
        // Switching sort
        if (ev.target.checked && newSortMethod !== sortMethod) {
          setSortMethod(newSortMethod);
          return;
        }
        // Unselect current sort
        if (!ev.target.checked && newSortMethod === sortMethod) {
          setSortMethod(null);
          return;
        }
      };
    },
    [sortMethod, setSortMethod]
  );

  const favorite = useMemo(() => {
    const clickedEntries = Object.entries(clicked);
    if (!clickedEntries.length) return { sound: null, clicks: 0 };
    const [favoriteId, favoriteClicks] = clickedEntries.reduce(
      (topEntry, entry) => (topEntry[1] < entry[1] ? entry : topEntry)
    );
    const favoriteSound = sounds[favoriteId];
    if (!favoriteSound) return { sound: null, clicks: 0 };
    return { sound: favoriteSound, clicks: favoriteClicks };
  }, [sounds, clicked]);
  console.log(favorite);

  const sortedFilteredSounds = useMemo(() => {
    return Object.entries(sounds)
      .sort(([idA, soundA], [idB, soundB]) => {
        const clickedB = clicked[idB];
        const clickedA = clicked[idA];
        switch (sortMethod) {
          case SORT.CLICKS_DESC:
            if (clickedB === clickedA)
              return soundA.name.localeCompare(soundB.name);
            return clickedB - clickedA;
          case SORT.CLICKS_ASC:
            if (clickedB === clickedA)
              return soundA.name.localeCompare(soundB.name);
            return clickedA - clickedB;
          case SORT.DUR_DESC:
            return soundB.duration - soundA.duration;
          case SORT.DUR_ASC:
            return soundA.duration - soundB.duration;
          default:
            return soundA.name.localeCompare(soundB.name);
        }
      })
      .filter(([_, { name, gameAudio }]) => {
        if (gameAudio && hideGameAudio) return false;
        return (
          searchTerm.length < 1 ||
          name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
  }, [sounds, clicked, searchTerm, sortMethod, hideGameAudio]);

  return (
    <div className="app">
      <div className="content">
        <h1>
          Biboo Soundboard{" "}
          <TwitterShareButton
            title={
              favorite.sound === null
                ? "Biboo Soundboard"
                : `I've clicked "${favorite.sound.name}" ${favorite.clicks} times on the Biboo Soundboard`
            }
            url="https://lyger.github.io/biboo-soundboard/"
            hashtags={["LMOAI"]}
          >
            <TwitterIcon size={32} round />
          </TwitterShareButton>
        </h1>
        <div className="search-bar">
          <div className="search-control">
            <input
              className="search-input"
              placeholder="Search"
              value={searchTerm}
              onChange={(ev) => setSearchTerm(ev.target.value)}
            />
            {searchTerm.length ? (
              <button
                className="search-reset"
                onClick={() => setSearchTerm("")}
              ></button>
            ) : null}
          </div>
        </div>
        <div className="options-bar">
          <label className="option">
            <input
              type="checkbox"
              checked={sortMethod === SORT.CLICKS_ASC}
              onChange={getSorter(SORT.CLICKS_ASC)}
            />
            Least clicked
          </label>
          <label className="option">
            <input
              type="checkbox"
              checked={sortMethod === SORT.CLICKS_DESC}
              onChange={getSorter(SORT.CLICKS_DESC)}
            />
            Most clicked
          </label>
          <label className="option">
            <input
              type="checkbox"
              checked={sortMethod === SORT.DUR_ASC}
              onChange={getSorter(SORT.DUR_ASC)}
            />
            Shortest
          </label>
          <label className="option">
            <input
              type="checkbox"
              checked={sortMethod === SORT.DUR_DESC}
              onChange={getSorter(SORT.DUR_DESC)}
            />
            Longest
          </label>
          <label
            className="option"
            checked={hideGameAudio}
            onChange={(ev) => setHideGameAudio(ev.target.checked)}
          >
            <input type="checkbox" />
            No game audio
          </label>
        </div>
        <div className="sound-wrapper">
          {sortedFilteredSounds.map(([id, { name, duration }]) => (
            <SoundButton
              key={id}
              name={name}
              clicks={clicked[id]}
              onClick={() => handleSoundClick(id)}
              playing={id === playingSoundId}
              duration={duration}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
