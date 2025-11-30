"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
// using native textarea here so we can overlay per-line controls
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Maximize2,
	Minimize2,
	Pencil,
	Check,
	X,
	Shuffle,
	ArrowUp,
	ArrowDown,
	LoaderPinwheel,
} from "lucide-react";
import Image from "next/image";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import Navbar from "./_components/navbar";
import localFont from "next/font/local";

import { Lexend_Deca } from "next/font/google";
import { Button } from "@/components/ui/button";
// DialogOverlay import removed (unused)
const lexendDeca = Lexend_Deca({
	subsets: ["latin"],
	weight: ["400", "700"],
});

const masque = localFont({
	src: "./_fonts/masque.ttf",
	variable: "--font-masque",
});

const magazine = localFont({
	src: "./_fonts/magazine.ttf",
	variable: "--font-magazine",
});

type NameOrder = "shuffle" | "ascending" | "descending";
type BackgroundChange =
	| { type: "color"; value: string }
	| { type: "image"; value: string }
	| { type: "reset" };

export default function Home() {
	const [names, setNames] = useState("Alice\nBob\nCharlie\nDiana\nEve");
	const [spinning, setSpinning] = useState(false);
	const [rotation, setRotation] = useState(0);
	const [winner, setWinner] = useState<string | null>(null);
	const [showDialog, setShowDialog] = useState(false);
	// Confetti: dynamically import react-confetti (no SSR)
	const Confetti = useMemo(
		() => dynamic(() => import("react-confetti"), { ssr: false }),
		[]
	);
	const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
	const [showConfetti, setShowConfetti] = useState(false);
	const [nameOrder, setNameOrder] = useState<NameOrder>("shuffle");
	const [timerDuration, setTimerDuration] = useState(10);
	const [backgroundSelection, setBackgroundSelection] =
		useState<BackgroundChange | null>(null);
	// Track when a fullpage image is applied to the body and its computed contrast color
	const [bodyBgIsImage, setBodyBgIsImage] = useState(false);
	const [bodyContrast, setBodyContrast] = useState<string>("");
	// softened text color (reduced contrast) applied to body and used for text color
	const [bodyTextColor, setBodyTextColor] = useState<string>("");
	// When the user selects an image for the wheel, we store its src here
	const [wheelImageSrc, setWheelImageSrc] = useState<string | null>(null);
	const [wheelTextColor, setWheelTextColor] = useState<string>("#000");
	// map of name (trimmed) -> include boolean. If true (or missing) name is included on wheel.
	const [includeMap, setIncludeMap] = useState<Record<string, boolean>>({});

	// Initialize includeMap from initial names (preserve any existing flags)
	useEffect(() => {
		setIncludeMap((prev) => {
			const lines = names.split("\n").map((l) => l.trim());
			const next: Record<string, boolean> = {};
			for (const ln of lines) {
				if (!ln) continue;
				next[ln] = prev[ln] ?? true;
			}
			return next;
		});
	}, [names]);
	// page text color state removed; we set document.body.style.color directly when needed

	// Compute a simple contrast color (black or white) from an ImageBitmap by
	// sampling pixels and computing average luminance.
	const computeContrastFromBitmap = (bmp: ImageBitmap) => {
		try {
			const sampleSize = 64; // draw into a small canvas for speed
			const off = document.createElement("canvas");
			off.width = sampleSize;
			off.height = sampleSize;
			const ctx = off.getContext("2d");
			if (!ctx) return "#000";
			// draw the bitmap scaled to sampleSize
			ctx.drawImage(bmp, 0, 0, sampleSize, sampleSize);
			const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
			let total = 0;
			let count = 0;
			// sample every 4th pixel to be faster
			for (let i = 0; i < data.length; i += 16) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				// standard luminance
				const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				total += lum;
				count += 1;
			}
			const avg = total / Math.max(1, count);
			return avg < 128 ? "#ffffff" : "#000000";
		} catch (err) {
			console.warn("contrast computation failed:", err);
			return "#000000";
		}
	};

	const getTextContrastStyles = useCallback(():
		| React.CSSProperties
		| undefined => {
		if (!bodyBgIsImage) return undefined;
		const c = (bodyContrast || "").toLowerCase();
		const isWhite = c === "#ffffff" || c === "#fff" || c.includes("white");
		// Softer stroke and shadow for a pleasing, reduced contrast look
		const stroke = isWhite ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.62)";
		const blur = isWhite
			? "0 2px 6px rgba(0,0,0,0.42)"
			: "0 2px 6px rgba(255,255,255,0.18)";
		const outline = `${stroke} -1px -1px 0, ${stroke} 1px -1px 0, ${stroke} -1px 1px 0, ${stroke} 1px 1px 0`;
		const textShadow = `${outline}, ${blur}`;
		return {
			color: bodyTextColor || undefined,
			textShadow,
		} as React.CSSProperties;
	}, [bodyBgIsImage, bodyContrast, bodyTextColor]);

	const getButtonContrastStyles = useCallback(():
		| React.CSSProperties
		| undefined => {
		if (!bodyBgIsImage) return undefined;
		const c = (bodyContrast || "").toLowerCase();
		const isWhite = c === "#ffffff" || c === "#fff" || c.includes("white");
		// Use a gentler border and shadow that still contrasts but is visually pleasing
		const stroke = isWhite ? "rgba(0,0,0,0.62)" : "rgba(255,255,255,0.65)";
		return {
			border: `1px solid ${stroke}`,
			boxShadow: isWhite
				? `0 6px 18px rgba(0,0,0,0.32)`
				: `0 6px 18px rgba(0,0,0,0.08)`,
		} as React.CSSProperties;
	}, [bodyBgIsImage, bodyContrast]);
	const [winningSound, setWinningSound] = useState("small-group-applause");
	const [spinSound, setSpinSound] = useState("single-spin");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [wheelTitle, setWheelTitle] = useState("Enter an Awesome Title");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [tempTitle, setTempTitle] = useState("Enter an Awesome Title");
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wheelSectionRef = useRef<HTMLDivElement>(null);
	// loaded image bitmap for faster drawing into the canvas (per-segment clipping)
	const wheelImageBitmapRef = useRef<ImageBitmap | null>(null);
	const audioBufferRef = useRef<AudioBuffer | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const lastSegmentRef = useRef<number>(-1);
	// dynamic deceleration extension (ms) used to allow the wheel to keep slowing until speed ~ 0
	const decelExtensionRef = useRef<number>(0);
	const drumBufferRef = useRef<AudioBuffer | null>(null);
	const winningBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
	const spinBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

	// textarea controls for per-line delete icon
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	// simple undo history for textarea content
	const historyRef = useRef<string[]>([names]);
	const historyIndexRef = useRef<number>(0);
	const MAX_HISTORY = 200;
	const [canUndo, setCanUndo] = useState(false);
	const [focusedLine, setFocusedLine] = useState<number | null>(null);
	// controlsTick forces a rerender when textarea scroll or similar events
	// occur so per-line control positions (computed by calcIconTop) update.
	const [controlsTick, setControlsTick] = useState(0);

	const calcIconTop = (ta?: HTMLTextAreaElement | null, lineIdx?: number) => {
		const el = ta ?? textareaRef.current;
		const idx = lineIdx ?? focusedLine ?? 0;
		if (!el) return 0;
		try {
			const style = window.getComputedStyle(el);
			let lineHeight = parseFloat(style.lineHeight || "");
			if (isNaN(lineHeight) || lineHeight === 0) {
				const fontSize = parseFloat(style.fontSize || "16") || 16;
				lineHeight = fontSize * 1.2;
			}
			const paddingTop = parseFloat(style.paddingTop || "0") || 0;
			const y = paddingTop + idx * lineHeight - el.scrollTop + 4;
			const max = el.clientHeight - lineHeight;
			return Math.max(4, Math.min(max, y));
		} catch {
			return 0;
		}
	};

	const updateFocusedLine = () => {
		const el = textareaRef.current;
		if (!el) {
			setFocusedLine(null);
			return;
		}
		const sel = el.selectionStart ?? 0;
		const idx = el.value.slice(0, sel).split("\n").length - 1;
		setFocusedLine(idx);
		// We no longer toggle a single focused-line control. Controls for every
		// non-empty line are rendered; force a rerender so positions update.
		setControlsTick((t) => t + 1);
	};

	const handleKeyDownInTextarea = () => {
		// update caret-derived state after the key event
		setTimeout(updateFocusedLine, 0);
	};

	const pushHistory = (value: string) => {
		const h = historyRef.current;
		let idx = historyIndexRef.current;
		// if we are not at the end, truncate forward history
		if (idx < h.length - 1) {
			h.splice(idx + 1);
		}
		h.push(value);
		idx = h.length - 1;
		// cap history
		if (h.length > MAX_HISTORY) {
			h.shift();
			idx = h.length - 1;
		}
		historyIndexRef.current = idx;
		setCanUndo(h.length > 1 && historyIndexRef.current > 0);
	};

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const v = e.target.value;
		// push new state into history
		pushHistory(v);
		setNames(v);
		// Sync includeMap: preserve existing include flags for matching trimmed names,
		// default to true for new names.
		setIncludeMap((prev) => {
			const lines = v.split("\n").map((l) => l.trim());
			const next: Record<string, boolean> = {};
			for (const ln of lines) {
				if (!ln) continue;
				next[ln] = prev[ln] ?? true;
			}
			return next;
		});
		// update caret/hover derived UI
		setTimeout(updateFocusedLine, 0);
	};

	const handleUndo = () => {
		const h = historyRef.current;
		let idx = historyIndexRef.current;
		if (idx <= 0) return;
		idx -= 1;
		historyIndexRef.current = idx;
		const prev = h[idx] ?? "";
		setNames(prev);
		setCanUndo(historyRef.current.length > 1 && historyIndexRef.current > 0);
		setTimeout(updateFocusedLine, 0);
	};

	const handleReset = () => {
		// push empty state and apply
		pushHistory("");
		setNames("");
		setCanUndo(historyRef.current.length > 1 && historyIndexRef.current > 0);
		setTimeout(updateFocusedLine, 0);
	};

	const handleClearLine = (index: number) => {
		const el = textareaRef.current;
		if (!el) return;
		const lines = el.value.split("\n");
		const clearedName = (lines[index] || "").trim();
		lines[index] = "";
		if (clearedName) {
			setIncludeMap((prev) => {
				const copy = { ...prev };
				delete copy[clearedName];
				return copy;
			});
		}
		const newValue = lines.join("\n");
		setNames(newValue);
		// position caret at start of the cleared line
		const pos = lines.slice(0, index).reduce((acc, l) => acc + l.length + 1, 0);
		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.focus();
				textareaRef.current.selectionStart = pos;
				textareaRef.current.selectionEnd = pos;
				updateFocusedLine();
			}
		}, 0);
	};

	const handleToggleInclude = (index: number, checked: boolean) => {
		const lines = names.split("\n").map((l) => l.trim());
		const name = lines[index] ?? "";
		if (!name) return;
		setIncludeMap((prev) => ({ ...prev, [name]: checked }));
	};

	// Initialize Web Audio API for better performance on mobile
	useEffect(() => {
		const initAudio = async () => {
			try {
				type ExtendedWindow = typeof window & {
					webkitAudioContext?: typeof AudioContext;
				};
				const audioConstructor =
					window.AudioContext || (window as ExtendedWindow).webkitAudioContext;
				if (!audioConstructor) return;
				const audioContext = new audioConstructor();
				audioContextRef.current = audioContext;

				// Fetch and decode drum roll
				console.log("📥 Loading drum roll...");
				const drumResponse = await fetch("/sounds/drum/drum-roll.mp3");
				const drumArrayBuffer = await drumResponse.arrayBuffer();
				const drumBuffer = await audioContext.decodeAudioData(drumArrayBuffer);
				drumBufferRef.current = drumBuffer;
				console.log("✅ Drum roll loaded");

				// Preload all winning sounds
				console.log("📥 Loading winning sounds...");
				const winningFiles = [
					"cheering-crowd-whistle",
					"fanfare-announcement",
					"huge-crowd-cheering",
					"moderate-applause",
					"small-group-applause",
					"video-game-win",
					"win-alarm",
					"yes-victory",
				];

				const bufferMap = new Map<string, AudioBuffer>();
				await Promise.all(
					winningFiles.map(async (fileName) => {
						try {
							const response = await fetch(`/sounds/winning/${fileName}.wav`);
							const arrayBuffer = await response.arrayBuffer();
							const buffer = await audioContext.decodeAudioData(arrayBuffer);
							bufferMap.set(fileName, buffer);
						} catch (err) {
							console.warn(`Failed to load ${fileName}:`, err);
						}
					})
				);
				winningBuffersRef.current = bufferMap;

				// Preload all spin sounds
				console.log("📥 Loading spin sounds...");
				const spinSoundFiles = [
					"alarm-beep-2mp3",
					"alarm-clock-beep",
					"bell-signal",
					"chime-bell-ring",
					"clock-close-up",
					"clock-gong",
					"clock-mix-tick",
					"clock-strikemp3",
					"electric-tickmp3",
					"pendulum-tick",
					"percussion-tock",
					"racing-countdown",
					"single-spin",
					"slow-racing-countdown",
					"ticker-single",
					"ticking-counter",
					"ticking-timer",
					"tick-tock-bell-beep",
					"tick-tock-bell",
					"wall-clock-tick",
					"wall-clock-tock",
				];

				const spinBufferMap = new Map<string, AudioBuffer>();
				await Promise.all(
					spinSoundFiles.map(async (fileName) => {
						try {
							const response = await fetch(`/sounds/spin/${fileName}.mp3`);
							const arrayBuffer = await response.arrayBuffer();
							const buffer = await audioContext.decodeAudioData(arrayBuffer);
							spinBufferMap.set(fileName, buffer);
						} catch (err) {
							console.warn(`Failed to load spin sound ${fileName}:`, err);
						}
					})
				);
				spinBuffersRef.current = spinBufferMap;
				console.log(
					"✅ Loaded",
					spinBufferMap.size,
					"spin sounds:",
					Array.from(spinBufferMap.keys())
				);

				// Set initial spin sound (default: single-spin)
				const defaultSpinBuffer = spinBufferMap.get("single-spin");
				if (defaultSpinBuffer) {
					audioBufferRef.current = defaultSpinBuffer;
					console.log("🔊 Initial wheel spin sound set to: single-spin");
				} else {
					console.error("❌ Failed to load default spin sound: single-spin");
				}
			} catch (error) {
				console.error("Audio initialization failed:", error);
			}
		};

		initAudio();

		return () => {
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	// Update wheel spin sound when selection changes
	useEffect(() => {
		if (spinBuffersRef.current && spinSound) {
			const buffer = spinBuffersRef.current.get(spinSound);
			if (buffer) {
				audioBufferRef.current = buffer;
				console.log("🔊 Wheel spin sound updated to:", spinSound);
			}
		}
	}, [spinSound]);

	// Play drum roll and winning audio when winner dialog opens
	useEffect(() => {
		if (showDialog && audioContextRef.current) {
			const audioContext = audioContextRef.current;

			console.log(
				"🎵 Winner dialog opened, audio context state:",
				audioContext.state
			);
			console.log("🥁 Drum buffer loaded:", !!drumBufferRef.current);
			console.log("🏆 Winning sound:", winningSound);
			console.log(
				"📦 Winning buffer loaded:",
				!!winningBuffersRef.current.get(winningSound)
			);
			console.log(
				"📋 Available winning sounds:",
				Array.from(winningBuffersRef.current.keys())
			);

			// Resume AudioContext if suspended (required on mobile)
			if (audioContext.state === "suspended") {
				console.log("⏯️ Resuming suspended audio context...");
				audioContext.resume().then(() => {
					console.log("✅ Audio context resumed, state:", audioContext.state);
				});
			}

			try {
				// Play drum roll using Web Audio API
				if (drumBufferRef.current) {
					console.log("🎵 Playing drum roll...");
					const drumSource = audioContext.createBufferSource();
					drumSource.buffer = drumBufferRef.current;
					const drumGain = audioContext.createGain();
					drumGain.gain.value = 0.8;
					drumSource.connect(drumGain);
					drumGain.connect(audioContext.destination);
					drumSource.start(0);
					console.log("✅ Drum roll started");
				} else {
					console.warn("❌ Drum buffer not loaded");
				}

				// Play selected winning sound using Web Audio API
				const winningBuffer = winningBuffersRef.current.get(winningSound);
				if (winningBuffer) {
					console.log("🎵 Playing winning sound:", winningSound);
					const winSource = audioContext.createBufferSource();
					winSource.buffer = winningBuffer;
					const winGain = audioContext.createGain();
					winGain.gain.value = 0.9;
					winSource.connect(winGain);
					winGain.connect(audioContext.destination);
					winSource.start(0);
					console.log("✅ Winning sound started");
				} else {
					console.warn("❌ Winning buffer not found for:", winningSound);
				}
			} catch (e) {
				console.error("❌ Failed to play winner audio", e);
			}
		}
	}, [showDialog, winningSound]);

	// Manage confetti visibility and window size
	useEffect(() => {
		// update size
		const update = () =>
			setWindowSize({ width: window.innerWidth, height: window.innerHeight });
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	useEffect(() => {
		if (showDialog) {
			setShowConfetti(true);
		} else {
			// hide confetti when dialog closes
			setShowConfetti(false);
		}
	}, [showDialog]);

	const reorderNames = useCallback((order: NameOrder, source: string) => {
		const parsed = source
			.split("\n")
			.map((name) => name.trim())
			.filter((name) => name !== "");

		if (parsed.length === 0) return "";

		const arranged = [...parsed];
		switch (order) {
			case "ascending":
				arranged.sort((a, b) => a.localeCompare(b));
				break;
			case "descending":
				arranged.sort((a, b) => b.localeCompare(a));
				break;
			case "shuffle":
			default:
				for (let i = arranged.length - 1; i > 0; i -= 1) {
					const j = Math.floor(Math.random() * (i + 1));
					[arranged[i], arranged[j]] = [arranged[j], arranged[i]];
				}
		}

		return arranged.join("\n");
	}, []);

	const handleNamesOrderChange = useCallback(
		(order: NameOrder) => {
			setNameOrder(order);
			setNames((prev) => {
				const next = reorderNames(order, prev);
				// update includeMap to preserve inclusion by name after reorder
				setIncludeMap((prevMap) => {
					const lines = next.split("\n").map((l) => l.trim());
					const nextMap: Record<string, boolean> = {};
					for (const ln of lines) {
						if (!ln) continue;
						nextMap[ln] = prevMap[ln] ?? true;
					}
					return nextMap;
				});
				return next;
			});
		},
		[reorderNames]
	);

	const handleTimerChange = useCallback((seconds: number) => {
		setTimerDuration(seconds);
	}, []);

	const handleBackgroundChange = useCallback((change: BackgroundChange) => {
		setBackgroundSelection(change);
	}, []);

	// Image list for the small Entries -> Image dropdown
	const [entryImageFiles, setEntryImageFiles] = useState<string[]>([]);
	const [entryLoadingImages, setEntryLoadingImages] = useState(true);

	useEffect(() => {
		let mounted = true;
		setEntryLoadingImages(true);
		fetch("/api/images")
			.then((res) => res.json())
			.then((data) => {
				if (!mounted) return;
				setEntryImageFiles(Array.isArray(data.images) ? data.images : []);
				setEntryLoadingImages(false);
			})
			.catch((err) => {
				console.error("Failed to load entry images:", err);
				if (mounted) setEntryLoadingImages(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	const toggleFullscreen = useCallback(async () => {
		if (!wheelSectionRef.current) return;

		try {
			if (!document.fullscreenElement) {
				await wheelSectionRef.current.requestFullscreen();
				setIsFullscreen(true);
			} else {
				await document.exitFullscreen();
				setIsFullscreen(false);
			}
		} catch (err) {
			console.error("Fullscreen error:", err);
		}
	}, []);

	const startEditingTitle = useCallback(() => {
		setTempTitle(wheelTitle);
		setIsEditingTitle(true);
	}, [wheelTitle]);

	const saveTitle = useCallback(() => {
		if (tempTitle.trim()) {
			setWheelTitle(tempTitle.trim());
		}
		setIsEditingTitle(false);
	}, [tempTitle]);

	const cancelEditTitle = useCallback(() => {
		setTempTitle(wheelTitle);
		setIsEditingTitle(false);
	}, [wheelTitle]);

	// Listen for fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			const isFS = !!document.fullscreenElement;
			setIsFullscreen(isFS);

			// Add/remove class to body for dialog styling
			if (isFS) {
				document.body.classList.add("fullscreen-active");
			} else {
				document.body.classList.remove("fullscreen-active");
			}
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.body.classList.remove("fullscreen-active");
		};
	}, []);

	// Background selection handling
	// - color: set page background and clear wheel image
	// - image: use the selection as the wheel image (do NOT set body background)
	// - reset/null: clear both
	useEffect(() => {
		if (backgroundSelection?.type === "color") {
			// color should apply to body; clear any wheel image
			setWheelImageSrc(null);
			document.body.style.background = backgroundSelection.value;
			document.body.style.backgroundImage = "";
			document.body.style.backgroundSize = "";
			document.body.style.backgroundPosition = "";
			document.body.style.backgroundRepeat = "";
			// reset any page text override
			document.body.style.color = "";
			setBodyBgIsImage(false);
			setBodyContrast("");
			setBodyTextColor("");
		} else if (backgroundSelection?.type === "image") {
			// If the selected image is a fullpage image, set the body background.
			// If it's a wheel image, use it to fill wheel partitions.
			const val = backgroundSelection.value || "";
			if (val.includes("/images/fullpage/")) {
				// Apply as body background
				document.body.style.background = "";
				document.body.style.backgroundImage = `url(${val})`;
				document.body.style.backgroundSize = "cover";
				document.body.style.backgroundPosition = "center";
				document.body.style.backgroundRepeat = "no-repeat";
				// compute contrast and apply to page text color
				(async () => {
					try {
						const res = await fetch(val);
						const blob = await res.blob();
						const bmp = await createImageBitmap(blob);
						const contrast = computeContrastFromBitmap(bmp);
						// soften the text color so it's slightly less extreme than pure black/white
						const softened =
							contrast === "#ffffff"
								? "rgba(255,255,255,0.94)"
								: "rgba(0,0,0,0.92)";
						document.body.style.color = softened;
						// set state so UI can adapt (we keep raw contrast for isWhite checks,
						// and bodyTextColor for actual CSS color values)
						setBodyBgIsImage(true);
						setBodyContrast(contrast);
						setBodyTextColor(softened);
					} catch (err) {
						console.warn("Failed to compute contrast for fullpage image:", err);
					}
				})();
			} else if (val.includes("/images/wheel/")) {
				// Use selected image as the wheel fill; do NOT change body background.
				// Only update the wheel image source so any fullpage/background image
				// previously applied to document.body is preserved.
				setWheelImageSrc(val);
			}
		} else {
			// reset everything
			setWheelImageSrc(null);
			document.body.style.background = "";
			document.body.style.backgroundImage = "";
			document.body.style.backgroundSize = "";
			document.body.style.backgroundPosition = "";
			document.body.style.backgroundRepeat = "";
			setBodyBgIsImage(false);
			setBodyContrast("");
			setBodyTextColor("");
		}
	}, [backgroundSelection]);

	useEffect(() => {
		return () => {
			document.body.style.background = "";
			document.body.style.backgroundImage = "";
			document.body.style.backgroundSize = "";
			document.body.style.backgroundPosition = "";
			document.body.style.backgroundRepeat = "";
		};
	}, []);
	// Build names list from textarea but respect includeMap (names mapped by trimmed value)
	const namesList = useMemo(() => {
		const lines = names.split("\n").map((n) => n.trim());
		return lines.filter((name) => name !== "" && includeMap[name] !== false);
	}, [names, includeMap]);

	const colors = useMemo(
		() => [
			"#FF6B6B",
			"#4ECDC4",
			"#45B7D1",
			"#FFA07A",
			"#98D8C8",
			"#F7DC6F",
			"#BB8FCE",
			"#85C1E2",
			"#F8B88B",
			"#ABEBC6",
		],
		[]
	);

	const drawWheel = useCallback(() => {
		const canvas = canvasRef.current;
		// if (!canvas || namesList.length === 0) return;
		// Use placeholder segments if no names entered
		const displayList =
			namesList.length > 0
				? namesList
				: ["Add", "Names", "Here", "To", "Start", "Spinning"];
		if (!canvas) return;

		const ctx = canvas.getContext("2d", {
			alpha: true,
			desynchronized: true, // Improve performance on mobile
		});
		if (!ctx) return;

		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		const radius = Math.min(centerX, centerY) - 7; // reduced padd3000ing for larger wheel from the edges

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Scale factor for center elements: 1.7x (70% increase) on md+ screens (768px+)
		const centerScale = canvas.width >= 768 ? 1.7 : 1;

		// Draw wheel segments
		const anglePerSegment = (2 * Math.PI) / displayList.length;

		displayList.forEach((name, index) => {
			const startAngle = index * anglePerSegment + (rotation * Math.PI) / 180;
			const endAngle = startAngle + anglePerSegment;

			// Build the sector path
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx.closePath();

			// If a wheel image is selected and loaded, draw it clipped to the sector.
			// Otherwise fall back to the color fill.
			if (wheelImageBitmapRef.current) {
				ctx.save();
				ctx.clip();
				try {
					const img = wheelImageBitmapRef.current as ImageBitmap;
					// Rotate the image content by the current wheel rotation so the image
					// appears to spin with the wheel. We translate to the wheel center,
					// rotate the canvas, draw the image centered, then restore.
					ctx.save();
					ctx.translate(centerX, centerY);
					ctx.rotate((rotation * Math.PI) / 180);
					ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
					ctx.restore();
				} catch (e) {
					// ignore draw errors
					console.warn("Failed to draw wheel image into canvas segment:", e);
				}
				ctx.restore();
			} else {
				ctx.fillStyle = colors[index % colors.length];
				ctx.fill();
			}

			// Draw separator line on top so image does not cover it
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx.closePath();
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 3;
			ctx.stroke();

			// Draw text with dynamic font size based on partition size and text length
			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate(startAngle + anglePerSegment / 2);
			ctx.textAlign = "center";
			// ctx.fillStyle = "#000";
			ctx.fillStyle =
				namesList.length === 0 ? "rgba(0, 0, 0, 0.4)" : wheelTextColor;

			// Calculate base font size based on canvas size (responsive)
			const baseFontSize = Math.max(12, Math.round(radius / 20));

			// Scale by partition size with boost for many names (8+)
			const angleDegrees = (anglePerSegment * 180) / Math.PI;
			// const minScale = namesList.length >= 8 ? 1.8 : 0.9;
			const minScale = displayList.length >= 8 ? 1.8 : 0.9;
			const partitionScale = Math.min(
				2.5,
				Math.max(minScale, angleDegrees / 30)
			);
			let fontSize = Math.round(baseFontSize * partitionScale);
			ctx.font = `bold ${fontSize}px Arial`;

			// Available text width (from center to near edge, accounting for padding)
			const maxTextWidth = radius * 0.55; // Max width before edge
			let textWidth = ctx.measureText(name).width;

			// If text is too wide, reduce font size proportionally
			if (textWidth > maxTextWidth) {
				const textLengthScale = maxTextWidth / textWidth;
				fontSize = Math.round(fontSize * textLengthScale);
				fontSize = Math.max(8, fontSize); // Minimum 8px
				ctx.font = `bold ${fontSize}px Arial`;
				textWidth = ctx.measureText(name).width;
			}

			// If still too wide after scaling, truncate with "..."
			let displayText = name;
			if (textWidth > maxTextWidth) {
				while (
					displayText.length > 1 &&
					ctx.measureText(displayText + "...").width > maxTextWidth
				) {
					displayText = displayText.slice(0, -1);
				}
				displayText += "...";
			}

			// If a wheel image is present, draw a subtle contrasting stroke and
			// shadow behind the text to ensure legibility against the image.
			if (wheelImageBitmapRef.current) {
				// Choose stroke color opposite to the text color for contrast
				const isTextWhite =
					(wheelTextColor || "").toLowerCase() === "#ffffff" ||
					(wheelTextColor || "").toLowerCase() === "#fff";
				const strokeColor = isTextWhite
					? "rgba(0,0,0,0.65)"
					: "rgba(255,255,255,0.9)";

				// Subtle shadow to lift text slightly (cleared after)
				ctx.shadowColor = isTextWhite
					? "rgba(0,0,0,0.25)"
					: "rgba(255,255,255,0.18)";
				ctx.shadowBlur = Math.max(1, Math.round(fontSize * 0.08));

				ctx.lineJoin = "round";
				ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.12));
				ctx.strokeStyle = strokeColor;
				ctx.strokeText(displayText, radius * 0.65, fontSize * 0.3);
				// draw filled text on top
				ctx.fillText(displayText, radius * 0.65, fontSize * 0.3);

				// reset shadow so it doesn't affect other drawings
				ctx.shadowColor = "transparent";
				ctx.shadowBlur = 0;
			} else {
				ctx.fillText(displayText, radius * 0.65, fontSize * 0.3);
			}
			ctx.restore();
		});

		// Add 3D gradient effect to wheel edges
		const gradient = ctx.createRadialGradient(
			centerX,
			centerY,
			radius * 0.5,
			centerX,
			centerY,
			radius
		);
		gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
		gradient.addColorStop(0.85, "rgba(255, 255, 255, 0)");
		gradient.addColorStop(0.95, "rgba(0, 0, 0, 0.08)");
		gradient.addColorStop(1, "rgba(0, 0, 0, 0.16)");

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
		ctx.fillStyle = gradient;
		ctx.fill();

		// Draw arrow at center with subtle dark shadow and white highlight for 3D depth
		// Triangle arrow shape matching the PNG
		ctx.save();
		ctx.translate(centerX + 20.5 * centerScale, centerY);
		ctx.scale(centerScale, centerScale); // Position moved right by half width

		// Draw a subtle dark soft shadow behind the arrow
		ctx.save();
		ctx.fillStyle = "rgba(0,0,0,0.08)";
		ctx.shadowColor = "rgba(0,0,0,0.16)";
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.moveTo(50, 0);
		ctx.lineTo(-25, -40);
		ctx.lineTo(-25, 40);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		// Main arrow with a small white highlight (existing look)
		ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
		ctx.shadowBlur = 12;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.fillStyle = "#000000";
		ctx.beginPath();
		ctx.moveTo(50, 0); // tip pointing right
		ctx.lineTo(-25, -40); // top left corner
		ctx.lineTo(-25, 40); // bottom left corner
		ctx.closePath();
		ctx.fill();

		// Add white highlight edge for more 3D depth
		ctx.shadowColor = "transparent";
		ctx.shadowBlur = 0;
		ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(50, 0);
		ctx.lineTo(-25, -40);
		ctx.stroke();

		ctx.restore();

		// Draw center circle with 3D radial gradient button effect
		ctx.beginPath();
		const circleRadius = 45 * centerScale;
		ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);

		// Create 3D radial gradient for button effect
		const buttonGrad = ctx.createRadialGradient(
			centerX - 10 * centerScale,
			centerY - 10 * centerScale,
			0,
			centerX,
			centerY,
			circleRadius
		);

		if (spinning) {
			// Pressed state - darker, inverted gradient
			buttonGrad.addColorStop(0, "#000000");
			buttonGrad.addColorStop(0.6, "#1a1a1a");
			buttonGrad.addColorStop(1, "#0d0d0d");
		} else {
			// Normal state - 3D raised button effect
			buttonGrad.addColorStop(0, "#2a2a2a");
			buttonGrad.addColorStop(0.5, "#1a1a1a");
			buttonGrad.addColorStop(1, "#000000");
		}

		ctx.fillStyle = buttonGrad;
		ctx.fill();

		// White border
		ctx.strokeStyle = "#FFFFFF";
		ctx.lineWidth = 3 * centerScale;
		ctx.stroke();

		// Add subtle inner shadow for pressed effect
		if (spinning) {
			const innerShadow = ctx.createRadialGradient(
				centerX,
				centerY,
				0,
				centerX,
				centerY,
				circleRadius - 3
			);
			innerShadow.addColorStop(0, "rgba(0,0,0,0)");
			innerShadow.addColorStop(0.8, "rgba(0,0,0,0)");
			innerShadow.addColorStop(1, "rgba(0,0,0,0.5)");
			ctx.beginPath();
			ctx.arc(centerX, centerY, circleRadius - 3, 0, 2 * Math.PI);
			ctx.fillStyle = innerShadow;
			ctx.fill();
		} else {
			// Add highlight for 3D effect when not pressed
			const highlight = ctx.createRadialGradient(
				centerX - 15 * centerScale,
				centerY - 15 * centerScale,
				0,
				centerX,
				centerY,
				circleRadius * 0.6
			);
			highlight.addColorStop(0, "rgba(255,255,255,0.15)");
			highlight.addColorStop(1, "rgba(255,255,255,0)");
			ctx.beginPath();
			ctx.arc(centerX, centerY, circleRadius - 3, 0, 2 * Math.PI);
			ctx.fillStyle = highlight;
			ctx.fill();
		}

		// Add "Spin" text in center
		ctx.fillStyle = spinning ? "#CCCCCC" : "#FFFFFF";
		ctx.font = `bold ${20 * centerScale}px masque`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		// Slight text offset when pressed
		const textOffsetY = spinning ? 2 * centerScale : 0;
		ctx.fillText("SPIN", centerX, centerY + textOffsetY);
	}, [namesList, rotation, colors, spinning, wheelTextColor]);

	// keep a ref to the latest drawWheel so other effects can call it without
	// adding drawWheel to their dependency arrays (which would cause re-runs).
	const drawWheelRef = useRef<() => void>(() => {});

	useEffect(() => {
		drawWheelRef.current = drawWheel;
		drawWheel();
	}, [drawWheel]);

	// Load the selected wheel image into an ImageBitmap for fast canvas draws.
	useEffect(() => {
		let mounted = true;

		// If no wheel image is selected, clear bitmap and redraw.
		if (!wheelImageSrc) {
			wheelImageBitmapRef.current = null;
			// use latest draw function
			drawWheelRef.current?.();
			return () => {
				mounted = false;
			};
		}

		// When wheelImageSrc changes, load the new bitmap. Do NOT clear the
		// existing bitmap upfront — keep it visible until the new image is ready.
		(async () => {
			try {
				const res = await fetch(wheelImageSrc as string);
				const blob = await res.blob();
				const bitmap = await createImageBitmap(blob);
				if (mounted) {
					wheelImageBitmapRef.current = bitmap;
					// compute contrast color for the selected image and update wheel text color
					try {
						const contrast = computeContrastFromBitmap(bitmap);
						setWheelTextColor(contrast);
					} catch (err) {
						console.warn("Failed to compute contrast for wheel image:", err);
					}
					// redraw wheel now that bitmap is ready using the latest draw function
					drawWheelRef.current?.();
				}
			} catch (err) {
				console.warn("Failed to load wheel image:", err);
				// leave previous bitmap (if any) in place; attempt redraw
				drawWheelRef.current?.();
			}
		})();

		return () => {
			mounted = false;
		};
	}, [wheelImageSrc]);

	const determineWinner = useCallback(
		(finalRotation: number) => {
			if (namesList.length === 0) return;

			const anglePerSegment = 360 / namesList.length;

			// The arrow points to the right (0 degrees / 360 degrees)
			// We need to find which segment is at the right after rotation
			const adjustedRotation = (360 - (finalRotation % 360)) % 360;
			const winnerIndex =
				Math.floor(adjustedRotation / anglePerSegment) % namesList.length;

			setWinner(namesList[winnerIndex]);
			setShowDialog(true);
		},
		[namesList]
	);

	const spinWheel = useCallback(() => {
		if (spinning || namesList.length === 0) return;

		setSpinning(true);

		const duration = Math.max(500, timerDuration * 1000);

		// Random final rotation (multiple full spins + random position)
		const spins = 5 + Math.floor(Math.random() * 5); // 5-10 full spins
		const randomDegree = Math.random() * 360;
		const totalRotation = spins * 360 + randomDegree;

		const startTime = Date.now();
		const startRotation = rotation;

		// Reset any prior dynamic extension for this spin
		decelExtensionRef.current = 0;

		const animate = () => {
			const elapsed = Date.now() - startTime;

			let currentRotation = startRotation;

			// Timings - determine accel/baseDecel/extraSlow from mapping based on timer seconds
			const clampSeconds = Math.max(2, Math.min(40, Math.round(timerDuration)));

			// Mapping definitions (seconds): index corresponds to ranges described in spec
			const phaseMap = [
				[1, 1, 1], // 2
				[1, 2, 1], // 3
				[2, 2, 2], // 4
				[2, 3, 2], // 5
				[2, 4, 2], // 6
				[3, 4, 3], // 7
				[3, 4, 3], // 8
				[3, 4, 3], // 9
				[3, 5, 4], // 10-14
				[3, 5, 5], // 15-19
				[3, 5, 6], // 20-40
			];

			const getPhaseForSeconds = (s: number) => {
				if (s <= 2) return phaseMap[0];
				if (s === 3) return phaseMap[1];
				if (s === 4) return phaseMap[2];
				if (s === 5) return phaseMap[3];
				if (s === 6) return phaseMap[4];
				if (s === 7) return phaseMap[5];
				if (s === 8) return phaseMap[6];
				if (s === 9) return phaseMap[7];
				if (s >= 10 && s <= 14) return phaseMap[8];
				if (s >= 15 && s <= 19) return phaseMap[9];
				return phaseMap[10]; // 20-40
			};

			const [accelS, baseDecelS, extraSlowS] = getPhaseForSeconds(clampSeconds);
			const accelDuration = accelS * 1000;
			const baseDecel = baseDecelS * 1000;
			const extraSlow = extraSlowS * 1000;
			const plannedDecel = baseDecel + extraSlow;

			// constant speed uses baseDecel to determine decel start point
			const constantSpeedDuration = duration - accelDuration - baseDecel;

			// Rotation splits
			const rotationDuringAccel = totalRotation * 0.5;
			const rotationDuringDecel = totalRotation * 0.5;

			// Peak speed reference from accel
			// Slightly increase middle/constant-phase speed so the wheel feels a bit faster
			// during the constant part of the spin. Tweak multiplier to taste.
			const middleSpeedMultiplier = 1; // 12% faster in middle phase
			const peakSpeedPerMs =
				(rotationDuringAccel / (accelDuration / 2)) * middleSpeedMultiplier;
			const rotationDuringConstant =
				peakSpeedPerMs * Math.max(0, constantSpeedDuration);

			// Compute phases
			if (elapsed < accelDuration) {
				// Acceleration (quadratic ease-in)
				const t = elapsed / accelDuration;
				const easeProgress = t * t;
				currentRotation = startRotation + rotationDuringAccel * easeProgress;
			} else if (
				constantSpeedDuration > 0 &&
				elapsed < accelDuration + constantSpeedDuration
			) {
				// Constant speed
				const constantElapsed = elapsed - accelDuration;
				currentRotation =
					startRotation +
					rotationDuringAccel +
					peakSpeedPerMs * constantElapsed;
			} else {
				// Deceleration phase - allow dynamic extension until angular speed near zero
				const decelElapsed =
					elapsed - accelDuration - Math.max(0, constantSpeedDuration);
				const dynamicDecelTotal = plannedDecel + decelExtensionRef.current;
				const u = Math.min(Math.max(decelElapsed / dynamicDecelTotal, 0), 1);
				const easeProgress = 1 - Math.pow(1 - u, 3); // cubic ease-out across full decel
				const rotationBeforeDecel =
					rotationDuringAccel + rotationDuringConstant;
				currentRotation =
					startRotation +
					rotationBeforeDecel +
					rotationDuringDecel * easeProgress;

				// instantaneous angular speed (deg per ms) from derivative of easing
				const easeDerivWrtU = 3 * Math.pow(1 - u, 2);
				const angularSpeed =
					(rotationDuringDecel * easeDerivWrtU) / dynamicDecelTotal;

				// If we've passed the planned decel and angular speed is still above threshold,
				// extend decel a bit so wheel reaches near-zero smoothly.
				const speedThreshold = 0.002; // deg per ms (~7.2 deg/s) — small threshold for near-zero
				const maxExtension = 10000; // ms max extra allowed (safety cap)
				const extensionStep = 100; // ms per frame
				if (
					decelElapsed >= plannedDecel &&
					angularSpeed > speedThreshold &&
					decelExtensionRef.current < maxExtension
				) {
					decelExtensionRef.current += extensionStep;
				}
			}

			setRotation(currentRotation % 360);

			// Detect segment change and play sound
			const anglePerSegment = 360 / namesList.length;
			const adjustedRotation = (360 - (currentRotation % 360)) % 360;
			const currentSegment =
				Math.floor(adjustedRotation / anglePerSegment) % namesList.length;

			if (currentSegment !== lastSegmentRef.current) {
				lastSegmentRef.current = currentSegment;
				// Play tick sound using Web Audio API (non-blocking)
				const audioBuffer = audioBufferRef.current;
				const audioContext = audioContextRef.current;
				if (audioBuffer && audioContext) {
					// Create a new source node for each tick (they're one-time use)
					const source = audioContext.createBufferSource();
					source.buffer = audioBuffer;
					source.connect(audioContext.destination);
					source.start(0);
				}
			}
			// Decide whether to continue animating. We want to run until the wheel
			// has slowed to near-zero angular speed, even if that goes past the planned timer.
			const decelStart = accelDuration + Math.max(0, constantSpeedDuration);
			const decelElapsed = Math.max(0, elapsed - decelStart);
			const dynamicDecelTotal =
				baseDecel + extraSlow + decelExtensionRef.current;

			// Compute instantaneous angular speed for current point in decel (deg/ms)
			let stillRunning = false;
			if (decelElapsed < dynamicDecelTotal) {
				stillRunning = true;
			} else {
				const u = Math.min(Math.max(decelElapsed / dynamicDecelTotal, 0), 1);
				const easeDerivWrtU = 3 * Math.pow(1 - u, 2);
				const rotationDuringDecel = totalRotation * 0.5;
				const angularSpeed =
					(rotationDuringDecel * easeDerivWrtU) / dynamicDecelTotal;
				const speedThreshold = 0.002; // deg/ms (~7.2 deg/s)
				if (
					angularSpeed > speedThreshold &&
					decelExtensionRef.current < 10000
				) {
					// extend a bit and continue
					decelExtensionRef.current += 100;
					stillRunning = true;
				}
			}

			if (stillRunning) {
				requestAnimationFrame(animate);
			} else {
				setSpinning(false);
				lastSegmentRef.current = -1; // Reset for next spin
				determineWinner(currentRotation % 360);
			}
		};

		animate();
	}, [spinning, namesList.length, rotation, determineWinner, timerDuration]);

	// Set canvas size to container width (fill parent)
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resizeCanvas = () => {
			const container = canvas.parentElement as HTMLElement | null;
			if (!container) return;

			const size = container.clientWidth; // full width of parent
			canvas.width = size;
			canvas.height = size; // keep square
			canvas.style.width = "100%";
			canvas.style.height = "auto";
			drawWheel();
		};

		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);
		return () => window.removeEventListener("resize", resizeCanvas);
	}, [drawWheel]);

	return (
		<div className="min-h-screen">
			{/* When spinning, render a full-screen overlay to block all clicks */}
			{spinning && (
				<div
					aria-hidden="true"
					className="fixed inset-0 z-50 bg-transparent pointer-events-auto cursor-wait"
					// stop propagation to be safe
					onClick={(e) => e.stopPropagation()}
				/>
			)}

			{/* Confetti - show while winner dialog is open */}
			{showConfetti && Confetti ? (
				<Confetti
					width={
						windowSize.width ||
						(typeof window !== "undefined" ? window.innerWidth : 0)
					}
					height={
						windowSize.height ||
						(typeof window !== "undefined" ? window.innerHeight : 0)
					}
					recycle={false}
					numberOfPieces={350}
					className="pointer-events-none w-full h-full fixed z-99999"
				/>
			) : null}
			<style jsx>{`
				@media (min-width: 768px) {
					#wheel:fullscreen {
						display: flex;
						flex-direction: column;
						justify-content: center;
						align-items: center;
						width: 85vmin !important;
						height: 100vh;
						margin: 0 auto;
						background: inherit;
						padding: 2rem;
					}
					#wheel:fullscreen > * {
						max-width: 100%;
					}
					#wheel:fullscreen .wheel-canvas-container {
						width: 100% !important;
						max-width: 85vmin;
						flex-shrink: 0;
					}
					#wheel:fullscreen canvas {
						max-width: 100% !important;
						max-height: 100% !important;
						width: 100% !important;
						height: auto !important;
					}
					#wheel:fullscreen .wheel-title {
						color: #f0ce91 !important;
					}
					#wheel:fullscreen input.wheel-title-input {
						color: #000 !important;
					}
				}
			`}</style>
			<style global jsx>{`
				/* Center dialog in fullscreen mode (target Radix data-slot attributes) */
				body.fullscreen-active [data-slot="dialog-content"],
				body.fullscreen-active
					[data-slot="dialog-portal"]
					[data-slot="dialog-content"],
				body.fullscreen-active [data-slot="dialog-overlay"] {
					position: fixed !important;
					top: 50% !important;
					left: 50% !important;
					transform: translate(-50%, -50%) !important;
					margin: 0 !important;
					z-index: 99999 !important;
					max-width: 90vmin !important;
					width: auto !important;
					/* Use a subtle 20% black backdrop for fullscreen dialog */
					background: rgba(0, 0, 0, 0.2) !important;
				}
				body.fullscreen-active [data-slot="dialog-overlay"] {
					z-index: 99998 !important;
					background: rgba(0, 0, 0, 0.2) !important;
				}

				/* Non-fullscreen dialog overlay backdrop (20% opacity) */
				[data-slot="dialog-overlay"] {
					background: rgba(0, 0, 0, 0.2) !important;
				}
			`}</style>
			{/* <div
				className="bg-red-500 h-[200px] w-[200px]"
				onClick={(e) => {
					e.currentTarget.requestFullscreen();
				}} 
			>
				{" "}
				<button>Full Screen</button>
				<button onClick={() => document.exitFullscreen()}>
					Exit fullscreen
				</button>
			</div> */}
			<Navbar
				onTimerChange={handleTimerChange}
				onBackgroundChange={handleBackgroundChange}
				onWinningSoundChange={setWinningSound}
				onSpinSoundChange={setSpinSound}
				currentTimer={timerDuration}
				currentWinningSound={winningSound}
				currentSpinSound={spinSound}
				audioContextRef={audioContextRef}
				winningBuffersRef={winningBuffersRef}
				spinBuffersRef={spinBuffersRef}
			/>
			<div className="container mx-auto py-6">
				<main className="flex md:flex-row flex-col gap-1">
					<section
						id="wheel"
						className={`md:w-[75%] lg:w-[70%] xl:w-[65%] 2xl:w-[55%] relative ${
							isFullscreen ? "bg-white" : ""
						}`}
						ref={wheelSectionRef}
					>
						{/* Title and Fullscreen Header */}
						<div className="flex items-center justify-center gap-3 mb-4 px-4 z-50">
							{/* Editable Title */}
							<div className="flex items-center gap-2 flex-1 justify-center">
								{isEditingTitle ? (
									<div
										key={`title-edit-${controlsTick}`}
										className="flex items-center gap-2"
									>
										<input
											type="text"
											value={tempTitle}
											onChange={(e) => setTempTitle(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") saveTitle();
												if (e.key === "Escape") cancelEditTitle();
											}}
											className="wheel-title-input text-xl md:text-3xl font-bold text-gray-800 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
											style={getTextContrastStyles() || undefined}
											autoFocus
										/>
										<button
											onClick={saveTitle}
											className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
											aria-label="Save title"
										>
											<Check size={20} />
										</button>
										<button
											onClick={cancelEditTitle}
											className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
											aria-label="Cancel"
										>
											<X size={20} />
										</button>
									</div>
								) : (
									<div
										className={`flex items-center gap-2 ${lexendDeca.className} tracking-tight `}
									>
										<h2
											className={`wheel-title text-xl md:text-3xl font-bold text-gray-800 `}
											style={getTextContrastStyles() || undefined}
										>
											{wheelTitle}
										</h2>
										<button
											onClick={startEditingTitle}
											className="p-2 hover:bg-gray-200 rounded-lg transition"
											aria-label="Edit title"
										>
											<Pencil
												size={18}
												className="text-gray-600"
												style={getTextContrastStyles() || undefined}
											/>
										</button>
									</div>
								)}
							</div>

							{/* Fullscreen button - only on md+ screens */}
							<button
								onClick={toggleFullscreen}
								className="hidden md:flex relative z-60 md:z-1 items-center gap-2 bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg transition-all duration-200 shadow-lg"
								aria-label={
									isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
								}
								style={getButtonContrastStyles() || undefined}
							>
								{isFullscreen ? (
									<>
										<Minimize2 size={20} />
										<span className="text-sm font-semibold">Exit</span>
									</>
								) : (
									<Maximize2 size={20} />
								)}
							</button>
						</div>

						<div className="wheel-canvas-container md:p-8">
							<canvas
								ref={canvasRef}
								className={`cursor-pointer w-full block p-0 ${
									spinning ? "pointer-events-none" : ""
								}`}
								style={{ padding: 0 }}
								onClick={spinWheel}
							/>
						</div>
						{namesList.length === 0 && (
							<p
								className="text-center text-gray-500 mt-1"
								style={getTextContrastStyles() || undefined}
							>
								Add names to the list to spin the wheel
							</p>
						)}
						{!spinning && namesList.length > 0 && (
							<p
								className="text-center text-gray-600 mt-1 text-[18px] md:text-[24px] font-bold "
								style={getTextContrastStyles() || undefined}
							>
								Click or Tap the wheel to spin!
							</p>
						)}
						{spinning && (
							<p
								className={`text-center ${masque.className} font-bold ${
									isFullscreen ? "text-blue-400" : "text-blue-900"
								} tracking-tight text-[18px] md:text-[24px] mt-2`}
								style={getTextContrastStyles() || undefined}
							>
								Spinning . . .
							</p>
						)}

						{isFullscreen && (
							<div
								className={`${
									showDialog ? "fixed" : "hidden"
								} left-0 top-0 h-full w-full rounded-[20px] p-4 z-40 justify-center items-center flex bg-black/20`}
							>
								{/* Fullscreen confetti sits behind the dialog content but inside the fullscreen element
								    so it will be visible while the wheel section is in fullscreen. */}
								{showConfetti && Confetti ? (
									<Confetti
										width={
											windowSize.width ||
											(typeof window !== "undefined" ? window.innerWidth : 0)
										}
										height={
											windowSize.height ||
											(typeof window !== "undefined" ? window.innerHeight : 0)
										}
										recycle={false}
										numberOfPieces={350}
										className="pointer-events-none absolute h-full w-full z-99999"
									/>
								) : null}
								<div
									className={`${magazine.className} border-2 shadow-lg gap-8 relative rounded-[10px] px-5 min-w-[600px]  flex flex-col items-center justify-center py-6  bg-linear-to-r from-yellow-100 via-yellow-200 to-yellow-400`}
								>
									<div className="wrap-break-word">
										<p
											className={`text-2xl tracking-widest text-yellow-700 font-extralight px-5`}
										>
											🎉 The winner is... 🎉
										</p>
										<Button
											variant="ghost"
											className="absolute right-0 text-[20px] top-0 p-4 font-bold bg-transparent hover:bg-transparent"
											onClick={() => setShowDialog(false)}
											aria-label="Close dialog"
										>
											<X size={20} />
										</Button>
									</div>
									<div>
										<p className="text-4xl tracking-widest text-center text-yellow-900">
											{winner}
										</p>
									</div>
								</div>
							</div>
						)}
					</section>

					<section id="names-list" className="md:w-[25%] my-2 p-4 font-bold">
						<div className="w-full">
							<label
								className="block  mb-2 text-gray-600"
								style={getTextContrastStyles() || undefined}
							>
								Enter names (one per line)
							</label>
							<div className="flex flex-col items-start gap-2">
								{/* Right-side quick-order buttons (visible on all screens). Mirrors the names order radio options */}
								<div
									id="entries"
									role="radiogroup"
									aria-label="Quick name ordering"
									className="flex items-stretch gap-2 ml-1 w-24 flex-wrap w-full"
								>
									<button
										type="button"
										role="radio"
										aria-checked={nameOrder === "shuffle"}
										onClick={() => handleNamesOrderChange("shuffle")}
										className="flex items-center gap-2 px-2 py-1 rounded-full text-sm text-white shadow justify-start"
										style={{
											background: "#008cbd",
											...(getButtonContrastStyles() || {}),
										}}
										// style={{ background: "#155cff" }}
									>
										<Shuffle size={16} />
										<span>Shuffle</span>
									</button>

									<button
										type="button"
										role="radio"
										aria-checked={nameOrder === "ascending"}
										onClick={() => handleNamesOrderChange("ascending")}
										className="flex items-center gap-2 px-2 py-1 rounded-full text-sm text-white shadow justify-start"
										style={{
											background: "#008cbd",
											...(getButtonContrastStyles() || {}),
										}}
									>
										<ArrowUp size={16} />
										<span>Asc</span>
									</button>

									<button
										type="button"
										role="radio"
										aria-checked={nameOrder === "descending"}
										onClick={() => handleNamesOrderChange("descending")}
										className="flex items-center gap-2 px-2 py-1 rounded-full text-sm text-white shadow justify-start"
										style={{
											background: "#008cbd",
											...(getButtonContrastStyles() || {}),
										}}
									>
										<ArrowDown size={16} />
										<span>Dsc</span>
									</button>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												role="button"
												aria-label="Image"
												className="flex items-center gap-2 px-2 py-1 rounded-full text-sm text-white shadow justify-start"
												style={{
													background: "#008cbd",
													...(getButtonContrastStyles() || {}),
												}}
											>
												<LoaderPinwheel size={16} />
												<span>Image</span>
											</button>
										</DropdownMenuTrigger>

										<DropdownMenuContent className="w-[360px] max-h-[320px] overflow-y-auto">
											<div className="p-3">
												<p className="text-muted-foreground text-xs uppercase tracking-wide mb-3">
													Choose wheel image
												</p>
												{entryLoadingImages ? (
													<div className="flex items-center justify-center py-8">
														<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
													</div>
												) : entryImageFiles.length === 0 ? (
													<p className="text-sm text-muted-foreground py-4 text-center">
														No images found in /public/images/wheel
													</p>
												) : (
													<div className="flex flex-wrap gap-2">
														{entryImageFiles.map((img) => (
															<div
																key={img}
																className="w-[120px] h-[80px] cursor-pointer rounded overflow-hidden border-2 border-muted hover:border-primary transition-colors relative bg-muted"
																onClick={() =>
																	handleBackgroundChange({
																		type: "image",
																		value: `/images/wheel/${img}`,
																	})
																}
															>
																<Image
																	src={`/images/wheel/${img}`}
																	alt={`Wheel ${img}`}
																	fill
																	sizes="120px"
																	className="object-cover"
																	loading="lazy"
																	quality={70}
																/>
															</div>
														))}
													</div>
												)}
											</div>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								<div className="relative flex-1 w-full">
									<textarea
										id="names-input"
										ref={(el) => {
											textareaRef.current = el;
										}}
										value={names}
										onChange={(e) => handleTextareaChange(e)}
										// placeholder="Enter names, one per line"
										rows={10}
										onClick={updateFocusedLine}
										onKeyUp={updateFocusedLine}
										onKeyDown={handleKeyDownInTextarea}
										onSelect={updateFocusedLine}
										onScroll={() => setControlsTick((t) => t + 1)}
										className="w-full whitespace-pre min-h-[400px] rounded-[7px] bg-gray-50 text-gray-800 resize-none text-[18px] md:text-[19px] font-bold border-4 shadow-inner border-gray-300 focus-visible:ring-0 focus-visible:border-blue-300 px-3 pt-3 pb-8 leading-7"
									/>

									{/* Per-line controls and overlays */}
									{names.split("\n").map((ln, idx) => {
										const name = ln.trim();
										if (!name) return null;
										const isIncluded = includeMap[name] !== false;
										return (
											<div key={`line-wrap-${idx}-${controlsTick}`}>
												{/* Overlay to show the line text with a strike-through when unchecked. Positioned over textarea text. */}
												{!isIncluded && (
													<div
														key={`line-overlay-${idx}-${controlsTick}`}
														className="absolute left-4 pointer-events-none text-[18px] md:text-[19px] decoration-red-400 font-bold text-gray-400 leading-7 line-through"
														style={{
															top: calcIconTop(textareaRef.current, idx) + "px",
														}}
													>
														{name}
													</div>
												)}
												<div
													key={`line-controls-${idx}-${controlsTick}`}
													className="absolute right-3 flex items-center gap-2"
													style={{
														top: calcIconTop(textareaRef.current, idx) + "px",
													}}
												>
													{/* Checkbox: keep textarea focused by preventing default on mouseDown,
													but toggle inclusion onClick so the first click takes effect. */}
													<input
														type="checkbox"
														aria-label={`Include ${name} on wheel`}
														onMouseDown={(e) => e.preventDefault()}
														checked={isIncluded}
														onClick={() =>
															handleToggleInclude(idx, !isIncluded)
														}
														className="w-5 h-5 bg-white rounded"
													/>

													<button
														type="button"
														onPointerDown={(e) => {
															e.preventDefault();
															handleClearLine(idx);
														}}
														aria-label={`Clear line ${idx + 1}`}
														className="w-5 h-5 bg-white/90 rounded shadow-md flex items-center justify-center hover:bg-white p-0"
													>
														<X size={18} color="#404040" />
													</button>
												</div>
											</div>
										);
									})}

									{/* Reset / Undo buttons placed bottom-right inside textarea wrapper (now relative to textarea only) */}
									<div className="absolute right-2 bottom-2 flex gap-2 p-0.5">
										<button
											type="button"
											onClick={handleReset}
											className="px-2 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600 shadow"
										>
											Reset
										</button>
										<button
											type="button"
											onClick={handleUndo}
											disabled={!canUndo}
											className="px-2 py-1 text-gray-50 rounded bg-[#404040] text-sm hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed shadow"
										>
											Undo
										</button>
									</div>
								</div>
							</div>
							<p
								className="text-sm text-gray-500 mt-2"
								style={getTextContrastStyles() || undefined}
							>
								{namesList.length} {namesList.length === 1 ? "name" : "names"}{" "}
								entered
							</p>
						</div>
					</section>
				</main>

				{/* {!isFullscreen && (
					<Dialog open={showDialog} onOpenChange={setShowDialog}>
						<DialogContent
							className={`${magazine.className} border-2 flex justify-center py-6  bg-linear-to-r from-yellow-100 via-yellow-200 to-yellow-400`}
							// Prevent closing when clicking outside/backdrop
							onPointerDownOutside={(e) => {
								e.preventDefault();
							}}
							// Prevent closing with Escape
							onEscapeKeyDown={(e) => {
								e.preventDefault();
							}}
						>
							<DialogHeader>
								<DialogTitle
									className={`text-xl tracking-widest py-2 text-yellow-700 font-extralight pb-3`}
								>
									🎉 The winner is... 🎉
								</DialogTitle>

								<DialogDescription className="text-4xl tracking-widest text-center text-yellow-900">
									{winner}
								</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				)} */}

				{!isFullscreen && (
					<div
						className={`${
							showDialog ? "fixed" : "hidden"
						} top-0 left-0 w-full h-full  flex items-center justify-center`}
					>
						{/* Backdrop - prevent clicks from closing */}
						<div
							className="fixed inset-0 bg-black/30"
							onMouseDown={(e) => e.preventDefault()}
						/>

						{/* Dialog container (plain div, accessible) */}
						<div
							aria-modal="true"
							aria-label="Winner dialog"
							tabIndex={-1}
							onKeyDown={(e) => {
								// Prevent closing via Escape (match original behavior)
								if (e.key === "Escape") e.preventDefault();
							}}
							className={`${magazine.className} border-2 shadow-lg gap-8 relative rounded-[10px] max-w-[95%] z-50 px-5 md:min-w-[600px] flex flex-col items-center justify-center py-6 bg-linear-to-r from-yellow-100 via-yellow-200 to-yellow-400`}
						>
							<div className="wrap-break-word">
								<p
									className={`text-2xl tracking-widest text-yellow-700 font-extralight px-5`}
								>
									🎉 The winner is... 🎉
								</p>
								<Button
									variant="ghost"
									className="absolute right-0 text-[20px] top-0 p-4 font-bold bg-transparent hover:bg-transparent"
									onClick={() => setShowDialog(false)}
									aria-label="Close dialog"
								>
									<X size={20} />
								</Button>
							</div>
							<div>
								<p className="text-4xl tracking-widest text-center text-yellow-900">
									{winner}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="shadow-lg md:h-[60px] h-5 border-b-6"></div>
			<div className="bg-[#fee4c1]">
				{/* Informational sections: history, description and quick guide placed above footer for SEO */}
				<section className="container mx-auto max-w-4xl py-10 px-4">
					<h2 className="text-2xl font-bold text-slate-800 mb-4">
						About the Spin Wheel
					</h2>
					<p className="text-slate-700 leading-relaxed mb-4">
						Spin wheels have been used for centuries as a simple, visual method
						of random selection. Carnival-style &quot;Wheel of Fortune&quot;
						attractions date back to the 19th century and evolved into radio and
						television game shows in the 20th century. Today, digital spin
						wheels recreate that excitement for events, classrooms, raffles and
						giveaways — combining fairness with the thrill of a live reveal.
					</p>

					<h3 className="text-xl font-semibold text-slate-800 mb-3">
						Why use SpinWheelQuiz?
					</h3>
					<p className="text-slate-700 leading-relaxed mb-6">
						SpinWheelQuiz is an online spin wheel generator optimized for fast
						setup, mobile devices and live events. Customize backgrounds, sounds
						and timers, manage entries quickly and run fair, transparent spins
						with a polished presentation that keeps audiences engaged.
					</p>

					<h3 className="text-xl font-semibold text-slate-800 mb-3">
						Quick Guide — How to Play
					</h3>
					<ol className="list-decimal list-inside ml-4 space-y-2 text-slate-700">
						<li>
							Enter entries (one per line) in the names area. Use the
							check/clear controls to manage individual lines.
						</li>
						<li>
							Pick a timer from the Timers menu (2–40s). The app uses sensible
							accel and decel phases so longer timers feel smoother.
						</li>
						<li>
							Customize the stage: choose backgrounds, spin and winner sounds to
							match your event.
						</li>
						<li>
							Click or tap the wheel to spin. The wheel will accelerate, cruise
							and slow naturally until the winner is revealed. You can replay as
							needed.
						</li>
						<li>
							When the wheel stops, the winner dialog appears with options to
							copy or export the result.
						</li>
					</ol>
				</section>
			</div>
		</div>
	);
}
