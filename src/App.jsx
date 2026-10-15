import React, { useEffect, useMemo, useRef, useState } from "react";

const people = [
  { username: "alexmorgan", name: "Alex Morgan", avatar: "photo-1534528741775-53994a69daeb" },
  { username: "sofiarivers", name: "Sofia Rivers", avatar: "photo-1524504388940-b1c1722653e1" },
  { username: "jordanlee", name: "Jordan Lee", avatar: "photo-1500648767791-00dcc994a43e" },
  { username: "maya.jpg", name: "Maya Chen", avatar: "photo-1531123897727-8f129e1688ce" },
  { username: "noahtravels", name: "Noah Williams", avatar: "photo-1506794778202-cad84cf45f1d" },
  { username: "elliegrace", name: "Ellie Grace", avatar: "photo-1529139574466-a303027c1d8b" },
  { username: "kaiandco", name: "Kai Thompson", avatar: "photo-1507003211169-0a1dd7228f2d" },
  { username: "luna", name: "Luna Park", avatar: "photo-1529626455594-4ff0802cfb7e" },
];

const photo = (id, width = 700) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const avatar = (id, width = 100) => photo(id, width);
const getStoredTheme = () => {
  try {
    return window.localStorage.getItem("instagram-theme") === "dark";
  } catch {
    return false;
  }
};
const initialPosts = [
  { id: 1, user: "sofiarivers", avatar: people[1].avatar, location: "Big Sur, California", image: "photo-1470770841072-f978cf4d019e", likes: 12843, caption: "Somewhere between the mountains and the sea 🌊", comments: [{ user: "alexmorgan", text: "This view is unreal ✨" }, { user: "maya.jpg", text: "Adding this to my bucket list!" }], time: "2 hours ago", following: true },
  { id: 2, user: "jordanlee", avatar: people[2].avatar, location: "Kyoto, Japan", image: "photo-1493976040374-85c8e12f0c0e", likes: 8431, caption: "Quiet mornings, little streets, and the best cup of matcha 🍵", comments: [{ user: "noahtravels", text: "Kyoto is magic!" }], time: "4 hours ago", following: true },
  { id: 3, user: "maya.jpg", avatar: people[3].avatar, location: "Somewhere in the city", image: "photo-1519608487953-e999c86e7455", likes: 29104, caption: "A little reminder to look up every once in a while 🌙", comments: [{ user: "elliegrace", text: "Needed this today 🤍" }], time: "6 hours ago", following: true },
  { id: 4, user: "noahtravels", avatar: people[4].avatar, location: "Lago di Braies, Italy", image: "photo-1500530855697-b586d89ba3ee", likes: 5421, caption: "Take the scenic route. Always. 🏔️", comments: [{ user: "luna", text: "Wow wow wow" }], time: "1 day ago", following: false },
];
const navItems = [
  ["Home", "bi-house-door", "bi-house-door-fill"],
  ["Search", "bi-search", "bi-search"],
  ["Explore", "bi-compass", "bi-compass-fill"],
  ["Reels", "bi-play-btn", "bi-play-btn-fill"],
  ["Messages", "bi-send", "bi-send-fill"],
  ["Notifications", "bi-heart", "bi-heart-fill"],
  ["Create", "bi-plus-square", "bi-plus-square-fill"],
  ["Profile", "bi-person-circle", "bi-person-circle"],
  ["More", "bi-list", "bi-list"],
];

function App() {
  const [dark, setDark] = useState(getStoredTheme);
  const [posts, setPosts] = useState(initialPosts);
  const [followed, setFollowed] = useState(() => new Set(["sofiarivers", "jordanlee", "maya.jpg", "alexmorgan"]));
  const [saved, setSaved] = useState(() => new Set());
  const [activeNav, setActiveNav] = useState("Home");
  const [profileUsername, setProfileUsername] = useState("alexmorgan");
  const [panel, setPanel] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [storyIndex, setStoryIndex] = useState(0);
  const [storySeen, setStorySeen] = useState(() => new Set());
  const [storyPaused, setStoryPaused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [heartBurst, setHeartBurst] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const fileInput = useRef(null);
  const toastTimer = useRef(null);
  const revealObserver = useRef(null);
  const storyTimer = useRef(null);
  const storyStartedAt = useRef(0);
  const storyRemaining = useRef(5000);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#000000" : "#ffffff");
    try {
      window.localStorage.setItem("instagram-theme", dark ? "dark" : "light");
    } catch {
      // Theme still works for this session when browser storage is unavailable.
    }
  }, [dark]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      if (modal) {
        setModal(null);
        if (modal.type === "create") setActiveNav("Home");
      } else if (panel) {
        setPanel("");
        if (panel === "search") setActiveNav("Home");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal, panel]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    revealObserver.current?.disconnect();
  }, []);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 500);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (modal?.type !== "story") {
      storyRemaining.current = 5000;
      return undefined;
    }
    if (storyPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    storyStartedAt.current = Date.now();
    storyTimer.current = setTimeout(() => {
      storyTimer.current = null;
      storyRemaining.current = 5000;
      if (storyIndex === people.length - 1) {
        setModal(null);
        return;
      }
      const nextIndex = storyIndex + 1;
      setStoryIndex(nextIndex);
      setStorySeen(current => new Set(current).add(people[nextIndex].username));
    }, storyRemaining.current);
    return () => {
      if (storyTimer.current !== null) {
        clearTimeout(storyTimer.current);
        storyTimer.current = null;
      }
    };
  }, [modal, storyIndex, storyPaused]);

  useEffect(() => {
    revealObserver.current?.disconnect();
    const elements = document.querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      elements.forEach(element => element.classList.add("is-visible"));
      return;
    }
    revealObserver.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.current?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    elements.forEach(element => revealObserver.current.observe(element));
    return () => revealObserver.current?.disconnect();
  }, [activeNav, posts]);

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    return people.filter(person => !query || person.username.toLowerCase().includes(query) || person.name.toLowerCase().includes(query));
  }, [search]);

  function notify(text) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function toggleFollow(username) {
    setFollowed(current => {
      const next = new Set(current);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  function updatePost(id, updater) {
    setPosts(current => current.map(post => post.id === id ? updater(post) : post));
  }

  function toggleLike(post) {
    updatePost(post.id, current => ({ ...current, liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) }));
  }

  function submitComment(event, post) {
    event.preventDefault();
    const text = (commentDrafts[post.id] || "").trim();
    if (!text) return;
    updatePost(post.id, current => ({ ...current, comments: [...current.comments, { user: "alexmorgan", text }] }));
    setCommentDrafts(current => ({ ...current, [post.id]: "" }));
  }

  function toggleSave(post) {
    setSaved(current => {
      const next = new Set(current);
      if (next.has(post.id)) {
        next.delete(post.id);
        notify("Removed from your saved posts");
      } else {
        next.add(post.id);
        notify("Saved to your collection");
      }
      return next;
    });
  }

  function handleNav(name) {
    if (name === "More") {
      setPanel(panel === "more" ? "" : "more");
      return;
    }
    if (name === "Search") {
      const closing = panel === "search";
      setPanel(closing ? "" : "search");
      setSearch("");
      setActiveNav(closing ? "Home" : "Search");
      return;
    }
    if (name === "Notifications") {
      setPanel(panel === "notifications" ? "" : "notifications");
      setActiveNav(name);
      return;
    }
    if (name === "Messages") {
      setPanel(panel === "messages" ? "" : "messages");
      setActiveNav(name);
      return;
    }
    setPanel("");
    setActiveNav(name);
    if (name === "Profile") setProfileUsername("alexmorgan");
    if (name === "Create") {
      setPhotoPreview("");
      setNewCaption("");
      setModal({ type: "create" });
    }
  }

  function openProfile(username) {
    setProfileUsername(username);
    setActiveNav("Profile");
    setPanel("");
  }

  function openStory(index) {
    setStoryIndex(index);
    setStoryPaused(false);
    storyRemaining.current = 5000;
    setStorySeen(current => new Set(current).add(people[index].username));
    setModal({ type: "story" });
  }

  function advanceStory() {
    const nextIndex = (storyIndex + 1) % people.length;
    setStoryIndex(nextIndex);
    setStoryPaused(false);
    storyRemaining.current = 5000;
    setStorySeen(current => new Set(current).add(people[nextIndex].username));
  }

  function toggleStoryPlayback() {
    if (!storyPaused) {
      if (storyTimer.current !== null) {
        clearTimeout(storyTimer.current);
        storyTimer.current = null;
        storyRemaining.current = Math.max(0, storyRemaining.current - (Date.now() - storyStartedAt.current));
      }
      setStoryPaused(true);
      return;
    }
    setStoryPaused(false);
  }

  function loadPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoPreview(reader.result);
      else notify("Couldn't load this image. Please try another.");
    };
    reader.onerror = () => notify("Couldn't load this image. Please try another.");
    reader.readAsDataURL(file);
  }

  function selectPhoto(event) {
    loadPhoto(event.target.files?.[0]);
    event.target.value = "";
  }

  function publishPost() {
    if (!photoPreview) return;
    const newPost = {
      id: Date.now(), user: "alexmorgan", avatar: people[0].avatar, location: "Shared with everyone",
      image: photoPreview, likes: 0, caption: newCaption.trim(), comments: [], time: "just now", following: true,
      localImage: true,
    };
    setPosts(current => [newPost, ...current]);
    setModal(null);
    setActiveNav("Home");
    setPhotoPreview("");
    setNewCaption("");
    notify("Your photo has been shared.");
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessages(current => [...current, text]);
    setMessage("");
  }

  function closeModal() {
    setModal(null);
    if (modal?.type === "create") setActiveNav("Home");
  }

  const heartPost = (post) => {
    if (!post.liked) toggleLike(post);
    setHeartBurst(post.id);
    setTimeout(() => setHeartBurst(current => current === post.id ? null : current), 900);
  };

  function Avatar({ id, className = "", alt = "" }) {
    return <img className={`avatar ${className}`} src={avatar(id)} alt={alt} />;
  }

  function StoryAvatar({ person, index }) {
    return <button className={`story ${storySeen.has(person.username) ? "seen" : ""} reveal`} onClick={() => openStory(index)} aria-label={`View ${person.username}'s story`}>
      <span className="story-ring"><img className="story-image" src={avatar(person.avatar)} alt="" /></span>
      <span className="story-name">{person.username}</span>
    </button>;
  }

  function PostCard({ post }) {
    const isSaved = saved.has(post.id);
    const isLiked = !!post.liked;
    const imageSrc = post.localImage ? post.image : photo(post.image, 1000);
    return <article className="post-card reveal">
      <header className="post-header">
        <span className="avatar ring"><img src={avatar(post.avatar)} alt="" /></span>
        <div className="post-meta">
          <button className="username" onClick={() => openProfile(post.user)}>{post.user}</button>
          <span className="dot">·</span><span className="post-time">{post.time}</span>
          {post.location && <><span className="dot">·</span><span className="post-time">{post.location}</span></>}
        </div>
        <button className="more-button" aria-label="More post options" onClick={() => setModal({ type: "options", post })}><i className="bi bi-three-dots"></i></button>
      </header>
      <div className="post-image-wrap" onDoubleClick={() => heartPost(post)}>
        <img className="post-image" src={imageSrc} alt={`Photo shared by ${post.user}`} loading={post.id > 2 ? "lazy" : "eager"} />
        <i className={`bi bi-heart-fill heart-burst ${heartBurst === post.id ? "show" : ""}`} aria-hidden="true"></i>
      </div>
      <div className="post-details">
        <div className="post-actions">
          <button className={`icon-button ${isLiked ? "liked" : ""}`} aria-label={isLiked ? "Unlike" : "Like"} onClick={() => toggleLike(post)}><i className={`bi ${isLiked ? "bi-heart-fill" : "bi-heart"}`}></i></button>
          <button className="icon-button" aria-label="Comment" onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}><i className="bi bi-chat"></i></button>
          <button className="icon-button" aria-label="Share post" onClick={() => { setSearch(""); setModal({ type: "share", post }); }}><i className="bi bi-send"></i></button>
          <button className={`icon-button push-right ${isSaved ? "saved" : ""}`} aria-label={isSaved ? "Remove saved post" : "Save post"} onClick={() => toggleSave(post)}><i className={`bi ${isSaved ? "bi-bookmark-fill" : "bi-bookmark"}`}></i></button>
        </div>
        <div className="likes">{post.likes.toLocaleString()} likes</div>
        <p className="caption"><button className="username" onClick={() => openProfile(post.user)}>{post.user}</button>{post.caption}</p>
        {post.comments.slice(-2).map((comment, index) => <p className="comment-line" key={`${comment.user}-${index}`}><button className="username" onClick={() => openProfile(comment.user)}>{comment.user}</button>{comment.text}</p>)}
        {post.comments.length > 2 && <button className="view-comments" onClick={() => setModal({ type: "comments", post })}>View all {post.comments.length} comments</button>}
        <form className="comment-form" onSubmit={event => submitComment(event, post)}>
          <input id={`comment-${post.id}`} className="comment-input" value={commentDrafts[post.id] || ""} onChange={event => setCommentDrafts(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Add a comment..." aria-label="Add a comment" />
          <button className="comment-submit" type="submit" disabled={!(commentDrafts[post.id] || "").trim()}>Post</button>
        </form>
      </div>
    </article>;
  }

  function SidePanel() {
    return <aside className="right-panel">
      <div className="account-row">
        <Avatar id={people[0].avatar} alt="Your profile" />
        <div className="account-copy"><button className="username" onClick={() => openProfile("alexmorgan")}>alexmorgan</button><span className="muted">Alex Morgan</span></div>
        <button className="text-link" onClick={() => notify("You're already signed in.")}>Switch</button>
      </div>
      <div className="section-heading"><strong>Suggested for you</strong><button onClick={() => notify("You're all caught up on suggestions.")}>See All</button></div>
      {people.slice(1, 6).map(person => <div className="suggestion" key={person.username}>
        <Avatar id={person.avatar} alt="" />
        <div className="suggestion-info"><button className="username" onClick={() => openProfile(person.username)}>{person.username}</button><span className="muted">Suggested for you</span></div>
        <button className="text-link" onClick={() => toggleFollow(person.username)}>{followed.has(person.username) ? "Following" : "Follow"}</button>
      </div>)}
      <footer className="footer-links"><span>About · Help · Press · API · Jobs · Privacy · Terms · Locations · Language · Meta Verified</span><span className="copyright">© 2025 INSTAGRAM FROM META</span></footer>
    </aside>;
  }

  function FeedView() {
    return <div className="feed-column">
      <div className="stories">{people.map((person, index) => <StoryAvatar key={person.username} person={person} index={index} />)}</div>
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>;
  }

  function ExploreView() {
    const explorePhotos = ["photo-1519608487953-e999c86e7455", "photo-1470770841072-f978cf4d019e", "photo-1493976040374-85c8e12f0c0e", "photo-1500530855697-b586d89ba3ee", "photo-1518837695005-2083093ee35b", "photo-1501785888041-af3ef285b470", "photo-1519681393784-d120267933ba", "photo-1470252649378-9c29740c9fa8", "photo-1464822759023-fed622ff2c3b"];
    return <div className="feed-column"><div className="search-box"><i className="bi bi-search"></i><input aria-label="Search Instagram" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="explore-grid">{explorePhotos.map((id, index) => <button key={id} onClick={() => setModal({ type: "explore", image: id, index })}><img src={photo(id, 400)} alt={`Explore photo ${index + 1}`} loading="lazy" /></button>)}</div></div>;
  }

  function ProfileView() {
    const profile = people.find(person => person.username === profileUsername) || people[0];
    const own = profile.username === "alexmorgan";
    return <div className="feed-column">
      <div className="profile-header"><Avatar id={profile.avatar} alt="Profile" /><div>
        <div className="d-flex align-items-center gap-3"><strong style={{ fontSize: 20 }}>{profile.username}</strong>{own ? <button className="btn btn-sm btn-light" onClick={() => notify("Profile settings opened.")}>Edit profile</button> : <button className="btn btn-sm btn-light" onClick={() => toggleFollow(profile.username)}>{followed.has(profile.username) ? "Following" : "Follow"}</button>}<button className="btn btn-sm btn-light" onClick={() => handleNav("Messages")}>Message</button></div>
        <div className="profile-stats"><span><strong>{own ? 24 : 186}</strong> posts</span><span><strong>{own ? "1,248" : "24.8K"}</strong> followers</span><span><strong>{own ? 589 : 842}</strong> following</span></div>
        <strong>{profile.name}</strong><div className="muted">Photographer · chasing the light ✨</div>
      </div></div>
      <div className="profile-tabs"><span><i className="bi bi-grid-3x3"></i> POSTS</span><span><i className="bi bi-bookmark"></i> SAVED</span><span><i className="bi bi-person-square"></i> TAGGED</span></div>
      <div className="explore-grid">{posts.filter(post => post.user === profile.username).map(post => <button key={post.id} onClick={() => setModal({ type: "post", post })}><img src={post.localImage ? post.image : photo(post.image, 400)} alt="Profile post" /></button>)}</div>
      {own && posts.filter(post => post.user === profile.username).length === 0 && <div className="empty-state"><i className="bi bi-camera"></i><h3>Share Photos</h3><p>When you share photos, they will appear on your profile.</p><button className="text-link" onClick={() => handleNav("Create")}>Share your first photo</button></div>}
    </div>;
  }

  function MainContent() {
    if (activeNav === "Explore") return <ExploreView />;
    if (activeNav === "Reels") return <div className="feed-column"><div className="reels-placeholder"><div><i className="bi bi-play-circle" style={{ fontSize: 58 }}></i><h3>Reels</h3><p className="muted">A little inspiration, one clip at a time.</p><button className="primary-button" style={{ width: "auto", padding: "8px 22px" }} onClick={() => notify("You're all caught up on Reels.")}>Explore Reels</button></div></div></div>;
    if (activeNav === "Profile") return <ProfileView />;
    if (activeNav === "Saved") return <div className="feed-column"><h2 className="page-heading"><i className="bi bi-bookmark"></i> Saved</h2>{posts.filter(post => saved.has(post.id)).map(post => <PostCard key={post.id} post={post} />)}{saved.size === 0 && <div className="empty-state"><i className="bi bi-bookmark"></i><h3>Save</h3><p>Save photos and videos that you want to see again.</p></div>}</div>;
    return <FeedView />;
  }

  function SidePopover() {
    if (panel === "search") return <section className="search-popover">
      <h2 className="panel-title">Search</h2><div className="search-box"><i className="bi bi-search"></i><input autoFocus placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} /><button className="icon-button" aria-label="Clear search" onClick={() => setSearch("")}><i className="bi bi-x-circle-fill"></i></button></div>
      <div className="section-heading"><strong>{search ? "Results" : "Recent"}</strong>{search && <button onClick={() => setSearch("")}>Clear</button>}</div>
      {filteredPeople.length ? filteredPeople.map(person => <button className="search-result" style={{ width: "100%", border: 0, color: "inherit", background: "transparent", textAlign: "left" }} key={person.username} onClick={() => openProfile(person.username)}><Avatar id={person.avatar} alt="" /><span className="suggestion-info"><strong>{person.username}</strong><span className="muted">{person.name}</span></span></button>) : <p className="muted">No results found.</p>}
    </section>;
    if (panel === "notifications") return <section className="search-popover"><h2 className="panel-title">Notifications</h2><div className="section-heading"><strong>Today</strong></div>{people.slice(1, 5).map((person, index) => <div className="notification-row" key={person.username}><Avatar id={person.avatar} alt="" /><span><strong>{person.username}</strong> {["liked your photo.", "started following you.", "mentioned you in a comment.", "liked your photo."][index]} <span className="muted">{index + 1}h</span></span>{index !== 1 ? <img src={photo(initialPosts[index % initialPosts.length].image, 70)} alt="" style={{ width: 42, height: 42, objectFit: "cover" }} /> : <button className="notification-action" onClick={() => toggleFollow(person.username)}>{followed.has(person.username) ? "Following" : "Follow"}</button>}</div>)}</section>;
    if (panel === "messages") return <div className="message-popover"><div className="message-header"><span>Messages</span><button className="icon-button" aria-label="Close messages" onClick={() => setPanel("")}><i className="bi bi-pencil-square"></i></button></div><div className="message-body"><div className="d-flex align-items-center gap-3"><Avatar id={people[1].avatar} alt="" /><div><strong>Sofia Rivers</strong><div className="muted">Active now</div></div></div>{messages.map((item, index) => <div key={index} className="text-end mt-3"><span className="px-3 py-2 rounded-pill text-white" style={{ background: "#3797f0", display: "inline-block" }}>{item}</span></div>)}<form className="message-compose" onSubmit={sendMessage}><input placeholder="Message..." aria-label="Message" value={message} onChange={event => setMessage(event.target.value)} /><button className="text-link" type="submit">Send</button></form></div></div>;
    if (panel === "more") return <section className="search-popover" style={{ top: "auto", bottom: 18, height: "auto", minHeight: 220, borderRadius: 14 }}><button className="share-row" onClick={() => { setActiveNav("Saved"); setPanel(""); }}><i className="bi bi-bookmark"></i> Saved</button><button className="share-row" onClick={() => setDark(current => !current)}><i className={`bi ${dark ? "bi-sun" : "bi-moon-stars"}`}></i> Switch appearance <span className="ms-auto">{dark ? "On" : "Off"}</span></button><button className="share-row" onClick={() => notify("Your activity is up to date.")}><i className="bi bi-activity"></i> Your activity</button><button className="share-row" onClick={() => { setPanel(""); notify("You are all caught up."); }}><i className="bi bi-box-arrow-right"></i> Log out</button></section>;
    return null;
  }

  function ModalContent() {
    if (!modal) return null;
    if (modal.type === "story") {
      const person = people[storyIndex];
      return <div className="modal-backdrop-custom" onClick={closeModal}><div className="story-view" onClick={event => event.stopPropagation()}><img key={storyIndex} src={photo(["photo-1470770841072-f978cf4d019e", "photo-1500530855697-b586d89ba3ee", "photo-1493976040374-85c8e12f0c0e", "photo-1501785888041-af3ef285b470"][storyIndex % 4], 900)} alt={`${person.username}'s story`} /><div className="story-progress"><span key={storyIndex} className={storyPaused ? "paused" : ""}></span></div><div className="story-top"><Avatar id={person.avatar} alt="" /><strong>{person.username}</strong><span className="muted" style={{ color: "#ffffffbb" }}>8h</span><button className="story-pause" onClick={toggleStoryPlayback} aria-label={storyPaused ? "Resume story" : "Pause story"}><i className={`bi ${storyPaused ? "bi-play-fill" : "bi-pause-fill"}`}></i></button><button className="story-close" onClick={closeModal} aria-label="Close story">×</button></div><button className="story-next" aria-label="Next story" onClick={advanceStory}></button></div></div>;
    }
    if (modal.type === "create") return <div className="modal-backdrop-custom" onClick={closeModal}><section className="custom-modal" onClick={event => event.stopPropagation()}><div className="modal-heading">Create new post</div><button className="modal-close" onClick={closeModal} aria-label="Close">×</button>{photoPreview ? <div className="modal-content-area"><img className="create-preview" src={photoPreview} alt="Post preview" /><textarea className="form-control mt-3" rows="3" placeholder="Write a caption..." value={newCaption} onChange={event => setNewCaption(event.target.value)}></textarea><button className="primary-button mt-3" onClick={publishPost}>Share</button><button className="btn btn-link w-100 mt-1" onClick={() => fileInput.current?.click()}>Choose a different photo</button></div> : <div className="modal-content-area"><div className={`create-drop ${isDraggingPhoto ? "dragging" : ""}`} onDragOver={event => { event.preventDefault(); setIsDraggingPhoto(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingPhoto(false); }} onDrop={event => { event.preventDefault(); setIsDraggingPhoto(false); loadPhoto(event.dataTransfer.files[0]); }}><div><i className="bi bi-images"></i><h5 className="mt-3">Drag photos and videos here</h5><button className="primary-button mt-2" style={{ width: "auto" }} onClick={() => fileInput.current?.click()}>Select from computer</button><input ref={fileInput} type="file" accept="image/*" hidden onChange={selectPhoto} /></div></div></div>}</section></div>;
    if (modal.type === "share") return <div className="modal-backdrop-custom" onClick={closeModal}><section className="custom-modal" onClick={event => event.stopPropagation()}><div className="modal-heading">Share</div><button className="modal-close" onClick={closeModal} aria-label="Close">×</button><div className="modal-content-area"><div className="search-box"><input placeholder="Search" aria-label="Search people to share with" value={search} onChange={event => setSearch(event.target.value)} /></div>{people.slice(0, 5).filter(person => !search || person.username.includes(search.toLowerCase())).map(person => <button className="share-row" key={person.username} onClick={() => { closeModal(); notify(`Post sent to ${person.username}.`); }}><Avatar id={person.avatar} alt="" /><strong>{person.username}</strong><span className="ms-auto text-link">Send</span></button>)}<button className="primary-button mt-3" onClick={() => { closeModal(); notify("Link copied to clipboard."); }}>Copy link</button></div></section></div>;
    if (modal.type === "options") return <div className="modal-backdrop-custom" onClick={closeModal}><section className="custom-modal" onClick={event => event.stopPropagation()} style={{ maxWidth: 400 }}><button className="modal-close" onClick={closeModal} aria-label="Close">×</button><div className="modal-content-area p-0">{["Report", followed.has(modal.post.user) ? "Unfollow" : "Follow", "Add to favorites", "Go to post", "Share to...", "Copy link", "Embed", "About this account", "Cancel"].map((label, index) => <button className="share-row justify-content-center" style={{ color: index === 0 ? "#ed4956" : undefined, fontWeight: index < 2 || index === 8 ? 650 : 400 }} key={label} onClick={() => { const post = modal.post; closeModal(); if (label === "Unfollow" || label === "Follow") toggleFollow(post.user); else if (label === "Add to favorites") notify("Added to your favorites."); else if (label === "Copy link") notify("Link copied to clipboard."); else if (label === "Share to...") { setSearch(""); setModal({ type: "share", post }); } else notify(`${label} selected.`); }}>{label}</button>)}</div></section></div>;
    if (modal.type === "comments") {
      const currentPost = posts.find(post => post.id === modal.post.id) || modal.post;
      return <div className="modal-backdrop-custom" onClick={closeModal}><section className="custom-modal" onClick={event => event.stopPropagation()}><div className="modal-heading">Comments</div><button className="modal-close" onClick={closeModal} aria-label="Close">×</button><div className="modal-content-area"><div className="comment-modal-list">{currentPost.comments.map((comment, index) => <div className="comment-modal-item" key={index}><Avatar id={(people.find(person => person.username === comment.user) || people[0]).avatar} alt="" /><div><strong>{comment.user}</strong><div>{comment.text}</div><span className="muted">Like · Reply</span></div></div>)}</div><form className="comment-form" onSubmit={event => { submitComment(event, currentPost); }}><input className="comment-input" placeholder="Add a comment..." value={commentDrafts[currentPost.id] || ""} onChange={event => setCommentDrafts(current => ({ ...current, [currentPost.id]: event.target.value }))} /><button className="comment-submit" type="submit" disabled={!(commentDrafts[currentPost.id] || "").trim()}>Post</button></form></div></section></div>;
    }
    if (modal.type === "explore") return <div className="modal-backdrop-custom" onClick={closeModal}><section className="custom-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={closeModal} aria-label="Close">×</button><img src={photo(modal.image, 900)} alt="Explore photo" style={{ display: "block", width: "100%", maxHeight: "80vh", objectFit: "contain" }} /></section></div>;
    if (modal.type === "post") return <div className="modal-backdrop-custom" onClick={closeModal}><section className="custom-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={closeModal} aria-label="Close">×</button><PostCard post={modal.post} /></section></div>;
    return null;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="wordmark" href="#" onClick={event => { event.preventDefault(); setActiveNav("Home"); setPanel(""); }}>Instagram</a>
      <nav className="nav-list" aria-label="Main navigation">{navItems.slice(0, 8).map(([name, outline, fill]) => <button key={name} data-nav={name} aria-label={name} className={`nav-item ${activeNav === name ? "active" : ""}`} onClick={() => handleNav(name)}><i className={`bi ${activeNav === name ? fill : outline}`}></i><span className="nav-label">{name}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setDark(current => !current)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}><i className={`bi ${dark ? "bi-sun" : "bi-moon-stars"}`}></i><span className="nav-label">{dark ? "Light mode" : "Dark mode"}</span></button><button data-nav="More" className={`nav-item ${panel === "more" ? "active" : ""}`} onClick={() => handleNav("More")}><i className="bi bi-list"></i><span className="nav-label">More</span></button></div>
    </aside>
    {panel === "search" && <button aria-label="Close search panel" onClick={() => { setPanel(""); setActiveNav("Home"); }} style={{ position: "fixed", inset: 0, zIndex: 21, border: 0, background: "transparent", cursor: "default" }}></button>}
    <SidePopover />
    <main className="main-area" onClick={event => { if (panel === "more" && !event.target.closest(".search-popover")) setPanel(""); }}>
      <div className="content-layout"><MainContent /><SidePanel /></div>
    </main>
    {panel === "messages" && <button aria-label="Close messages panel" onClick={() => setPanel("")} style={{ position: "fixed", inset: 0, zIndex: 29, border: 0, background: "transparent" }}></button>}
    <ModalContent />
    {toast && <div className="notification-toast" role="status">{toast}</div>}
    {showScrollTop && <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} aria-label="Back to top"><i className="bi bi-arrow-up"></i></button>}
  </div>;
}

export default App;
