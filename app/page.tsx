"use client";

import {
	useState,
	useRef,
	useEffect,
	useLayoutEffect,
	useCallback,
	useMemo,
} from "react";
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
	Trash2,
	Shuffle,
	ArrowUp,
	ArrowDown,
	LoaderPinwheel,
	Palette,
	UploadCloud,
	Grip,
	Image as ImageIcon,
	Percent,
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
const adalima = localFont({
	src: "./_fonts/adalima.ttf",
	variable: "--font-adalima",
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
	// Per-partition custom colors (advanced mode color picker)

	// Palette popover state (which line's palette is open)
	const [paletteOpenFor, setPaletteOpenFor] = useState<number | null>(null);
	const paletteRef = useRef<HTMLDivElement | null>(null);
	const paletteAnchorRef = useRef<HTMLElement | null>(null);
	const paletteColors = useMemo(
		() => [
			"#FF6B6B",
			"#FF8A80",
			"#FF5252",
			"#FF1744",
			"#D50000",
			"#FFAB40",
			"#FFA726",
			"#FF9800",
			"#FFB86B",
			"#FFD54F",
			"#F7DC6F",
			"#F0E68C",
			"#ABEBC6",
			"#A3E4D7",
			"#4ECDC4",
			"#45B7D1",
			"#5DADE2",
			"#85C1E2",
			"#7D3C98",
			"#BB8FCE",
			"#F1948A",
			"#E74C3C",
			"#A3BE8C",
			"#2ECC71",
			"#27AE60",
			"#16A085",
			"#34495E",
			"#95A5A6",
			"#F1948A",
			"#F8B88B",
		],
		[]
	);

	const openPaletteFor = useCallback((idx: number, anchor?: HTMLElement) => {
		paletteAnchorRef.current = anchor ?? null;
		setPaletteOpenFor(idx);
	}, []);

	const closePalette = useCallback(() => {
		setPaletteOpenFor(null);
		paletteAnchorRef.current = null;
	}, []);

	const handlePaletteSelect = useCallback(
		(idx: number, color: string) => {
			const id = lineIdsRef.current?.[idx];
			if (id) {
				setPartitionColorsById((prev) => ({ ...prev, [id]: color }));
				// Also remove any legacy index-keyed color for this index
				setPartitionColors((prev) => {
					const copy = { ...prev };
					delete copy[idx];
					return copy;
				});
			} else {
				setPartitionColors((prev) => ({ ...prev, [idx]: color }));
			}
			drawWheelRef.current?.();
			closePalette();
		},
		[closePalette]
	);

	const handlePaletteReset = useCallback(
		(idx: number) => {
			const id = lineIdsRef.current?.[idx];
			if (id) {
				setPartitionColorsById((prev) => {
					const copy = { ...prev };
					delete copy[id];
					return copy;
				});
				setPartitionColors((prev) => {
					const copy = { ...prev };
					delete copy[idx];
					return copy;
				});
			} else {
				setPartitionColors((prev) => {
					const copy = { ...prev };
					delete copy[idx];
					return copy;
				});
			}
			drawWheelRef.current?.();
			closePalette();
		},
		[closePalette]
	);

	// Close on outside click or Escape
	useEffect(() => {
		if (paletteOpenFor === null) return;

		const onDocDown = (ev: MouseEvent) => {
			const tgt = ev.target as Node | null;
			if (!tgt) return;
			if (paletteRef.current && paletteRef.current.contains(tgt)) return;
			if (paletteAnchorRef.current && paletteAnchorRef.current.contains(tgt))
				return;
			closePalette();
		};

		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === "Escape") closePalette();
		};

		document.addEventListener("mousedown", onDocDown);
		document.addEventListener("keydown", onKey);

		return () => {
			document.removeEventListener("mousedown", onDocDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [paletteOpenFor, closePalette]);

	// Reposition popover on scroll/resize
	useEffect(() => {
		if (paletteOpenFor === null) return;
		let raf = 0;
		const update = () => {
			if (!paletteAnchorRef.current || !paletteRef.current) return;
			const r = paletteAnchorRef.current.getBoundingClientRect();
			const pop = paletteRef.current;
			pop.style.position = "fixed";

			// compute horizontal center anchored to button, then clamp so popover stays inside viewport
			const popW = pop.offsetWidth || 160;
			const desiredCenter = Math.round(r.left + r.width / 2);
			const minCenter = Math.round(popW / 2) + 8;
			const maxCenter = Math.round(window.innerWidth - popW / 2) - 8;
			const clampedCenter = Math.max(
				minCenter,
				Math.min(maxCenter, desiredCenter)
			);
			pop.style.left = `${clampedCenter}px`;
			// use translate to center horizontally
			pop.style.transform = "translate(-50%, 0)";

			// position below if space, otherwise above; ensure top is clamped into viewport
			let top = Math.round(r.bottom + 8);
			if (top + pop.offsetHeight > window.innerHeight - 8) {
				// try above
				top = Math.round(r.top - pop.offsetHeight - 8);
			}
			// final clamp
			top = Math.max(
				8,
				Math.min(top, Math.max(8, window.innerHeight - pop.offsetHeight - 8))
			);
			pop.style.top = `${top}px`;
			// make visible after positioning
			pop.style.opacity = "1";
		};

		const tick = () => {
			update();
			raf = requestAnimationFrame(tick);
		};

		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		tick();

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [paletteOpenFor]);

	// Slider popover state for per-partition weight control
	const [sliderOpenFor, setSliderOpenFor] = useState<number | null>(null);
	const sliderRef = useRef<HTMLDivElement | null>(null);
	const sliderAnchorRef = useRef<HTMLElement | null>(null);

	// Text input for weight popover (string so user can type freely)
	const [sliderWeightText, setSliderWeightText] = useState<string>("");

	// Slider popover: close on outside click / Escape
	useEffect(() => {
		if (sliderOpenFor === null) return;
		const onDocDown = (ev: MouseEvent) => {
			const tgt = ev.target as Node | null;
			if (!tgt) return;
			if (sliderRef.current && sliderRef.current.contains(tgt)) return;
			if (sliderAnchorRef.current && sliderAnchorRef.current.contains(tgt))
				return;
			setSliderOpenFor(null);
			sliderAnchorRef.current = null;
		};
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === "Escape") {
				setSliderOpenFor(null);
				sliderAnchorRef.current = null;
			}
		};
		document.addEventListener("mousedown", onDocDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDocDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [sliderOpenFor]);

	// Keep the weight text input synced when a popover opens so the user sees
	// the current numeric weight and can type freely.
	useEffect(() => {
		if (sliderOpenFor === null) {
			setSliderWeightText("");
			return;
		}
		const idx = sliderOpenFor as number;
		const id = lineIdsRef.current?.[idx];
		const current = id
			? partitionWeightsByIdRef.current[id] ??
			  partitionWeightsRef.current[idx] ??
			  1
			: partitionWeightsRef.current[idx] ?? 1;
		setSliderWeightText(String(current));
	}, [sliderOpenFor]);

	// Reposition slider popover on scroll/resize when open
	useEffect(() => {
		if (sliderOpenFor === null) return;
		let raf = 0;
		const update = () => {
			if (!sliderAnchorRef.current || !sliderRef.current) return;
			const r = sliderAnchorRef.current.getBoundingClientRect();
			const pop = sliderRef.current;
			pop.style.position = "fixed";
			const popW = pop.offsetWidth || 240;
			const desiredCenter = Math.round(r.left + r.width / 2);
			const minCenter = Math.round(popW / 2) + 8;
			const maxCenter = Math.round(window.innerWidth - popW / 2) - 8;
			const clampedCenter = Math.max(
				minCenter,
				Math.min(maxCenter, desiredCenter)
			);
			pop.style.left = `${clampedCenter}px`;
			pop.style.transform = "translate(-50%, 0)";
			let top = Math.round(r.bottom + 8);
			if (top + pop.offsetHeight > window.innerHeight - 8)
				top = Math.round(r.top - pop.offsetHeight - 8);
			top = Math.max(
				8,
				Math.min(top, Math.max(8, window.innerHeight - pop.offsetHeight - 8))
			);
			pop.style.top = `${top}px`;
			pop.style.opacity = "1";
		};
		const tick = () => {
			update();
			raf = requestAnimationFrame(tick);
		};
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		tick();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [sliderOpenFor]);
	const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
	const [showConfetti, setShowConfetti] = useState(false);
	const [nameOrder, setNameOrder] = useState<NameOrder>("shuffle");
	const [timerDuration, setTimerDuration] = useState(10);
	const [backgroundSelection, setBackgroundSelection] =
		useState<BackgroundChange | null>(null);
	// Track when a fullpage image is applied to the body and its computed contrast color
	const [bodyBgIsImage, setBodyBgIsImage] = useState(false);
	// Track when a body background color (not image) is applied so we can apply the
	// same softened contrast/stroke/shadow styles as we do for fullpage images.
	const [bodyBgIsColor, setBodyBgIsColor] = useState(false);
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

	// Compute contrast (black or white) from a CSS color string (hex or rgb).
	const computeContrastFromColor = (color: string) => {
		try {
			let r = 0,
				g = 0,
				b = 0;
			const s = color.trim().toLowerCase();
			if (s.startsWith("#")) {
				let hex = s.slice(1);
				if (hex.length === 3) {
					hex = hex
						.split("")
						.map((c) => c + c)
						.join("");
				}
				if (hex.length === 6) {
					r = parseInt(hex.slice(0, 2), 16);
					g = parseInt(hex.slice(2, 4), 16);
					b = parseInt(hex.slice(4, 6), 16);
				}
			} else if (s.startsWith("rgb(") || s.startsWith("rgba(")) {
				const nums = s.replace(/rgba?\(|\)|\s/g, "").split(",");
				r = parseInt(nums[0], 10) || 0;
				g = parseInt(nums[1], 10) || 0;
				b = parseInt(nums[2], 10) || 0;
			} else {
				// Fallback: create a temporary element to resolve color to rgb
				const el = document.createElement("div");
				el.style.color = color;
				document.body.appendChild(el);
				const cs = window.getComputedStyle(el).color;
				document.body.removeChild(el);
				const nums = cs.replace(/rgba?\(|\)|\s/g, "").split(",");
				r = parseInt(nums[0], 10) || 0;
				g = parseInt(nums[1], 10) || 0;
				b = parseInt(nums[2], 10) || 0;
			}
			const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			return lum < 128 ? "#ffffff" : "#000000";
		} catch (err) {
			console.warn("Failed to compute contrast from color:", color, err);
			return "#000000";
		}
	};

	const getTextContrastStyles = useCallback(():
		| React.CSSProperties
		| undefined => {
		// Apply contrast styles when either a fullpage image or a body color is active.
		if (!bodyBgIsImage && !bodyBgIsColor) return undefined;
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
	}, [bodyBgIsImage, bodyBgIsColor, bodyContrast, bodyTextColor]);

	const getButtonContrastStyles = useCallback(():
		| React.CSSProperties
		| undefined => {
		// Apply contrast styles when either a fullpage image or a body color is active.
		if (!bodyBgIsImage && !bodyBgIsColor) return undefined;
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

	// refs for advanced-mode per-line inputs, keyed by original index after render
	const advancedInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
	// refs for names-list per-line inputs (non-advanced mode)
	const listInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

	// Drag-and-drop: track the index being dragged and highlight drop target
	const dragIndexRef = useRef<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	// simple undo history for textarea content
	const historyRef = useRef<string[]>([names]);
	const historyIndexRef = useRef<number>(0);
	const MAX_HISTORY = 200;
	const [canUndo, setCanUndo] = useState(false);
	const [focusedLine, setFocusedLine] = useState<number | null>(null);
	// controlsTick forces a rerender when textarea scroll or similar events
	// occur so per-line control positions (computed by calcIconTop) update.
	const [controlsTick, setControlsTick] = useState(0);
	// Advanced mode: show extra per-line UI blocks below each textarea line
	const [advancedMode, setAdvancedMode] = useState(false);

	// measured textarea size (used to render identical-size div in Advanced mode)
	const [textareaSize, setTextareaSize] = useState<{
		width: number;
		height: number;
	}>({
		width: 0,
		height: 0,
	});

	const measureTextarea = () => {
		const el = textareaRef.current;
		if (!el) return { width: 0, height: 0 };
		return { width: el.clientWidth, height: el.clientHeight };
	};

	const adjustTextareaHeight = () => {
		const el = textareaRef.current;
		if (!el) return;
		// reset to auto to measure content height
		el.style.height = "auto";
		const scrollH = el.scrollHeight;
		const maxH = 800;
		if (scrollH <= maxH) {
			el.style.height = scrollH + "px";
			el.style.overflowY = "hidden";
		} else {
			el.style.height = maxH + "px";
			el.style.overflowY = "auto";
		}
	};

	useLayoutEffect(() => {
		// measure after DOM mutations; only set state when size actually changes
		const apply = () => {
			// ensure textarea height matches contents before measuring
			adjustTextareaHeight();
			const s = measureTextarea();
			if (!s) return;
			setTextareaSize((prev) => {
				if (prev.width === s.width && prev.height === s.height) return prev;
				return s;
			});
		};

		apply();
		const onResize = () => apply();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [advancedMode, names, controlsTick]);

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

	const getLineHeight = () => {
		const el = textareaRef.current;
		if (!el) return 20;
		try {
			const style = window.getComputedStyle(el);
			let lineHeight = parseFloat(style.lineHeight || "");
			if (isNaN(lineHeight) || lineHeight === 0) {
				const fontSize = parseFloat(style.fontSize || "16") || 16;
				lineHeight = fontSize * 1.2;
			}
			return lineHeight;
		} catch {
			return 20;
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

		// If the cursor moved to a new line, remove any other empty lines
		// except for the current line. This keeps the list compact when
		// the user navigates to a fresh line.
		const prevIdx = focusedLine;
		if (prevIdx !== idx) {
			const lines = el.value.split("\n");
			// detect empty lines (whitespace-only) excluding current idx
			const emptyOthers = lines.some((l, i) => i !== idx && l.trim() === "");
			if (emptyOthers) {
				// compute new names with other empty lines removed
				let charPos = 0; // new caret position after compaction
				const kept: string[] = [];
				for (let i = 0; i < lines.length; i++) {
					const isEmpty = lines[i].trim() === "";
					if (isEmpty && i !== idx) continue;
					// if this is before the original idx, add to charPos
					if (i < idx) {
						charPos += lines[i].length + 1; // include newline
					}
					kept.push(lines[i]);
				}
				const newValue = kept.join("\n");
				setNames(newValue);
				// restore caret roughly to the same logical line
				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.focus();
						textareaRef.current.selectionStart = Math.min(
							charPos,
							textareaRef.current.value.length
						);
						textareaRef.current.selectionEnd =
							textareaRef.current.selectionStart;
						// update focused line state after change
						const sel2 = textareaRef.current.selectionStart ?? 0;
						const newIdx =
							textareaRef.current.value.slice(0, sel2).split("\n").length - 1;
						setFocusedLine(newIdx);
						setControlsTick((t) => t + 1);
					}
				}, 0);
				return;
			}
		}

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

	// Clear a line's text without relying on the textarea element (used in Advanced mode)
	const clearLineDirect = (index: number) => {
		setNames((prev) => {
			const lines = prev.split("\n");
			const clearedName = (lines[index] || "").trim();
			lines[index] = "";
			if (clearedName) {
				setIncludeMap((prevMap) => {
					const copy = { ...prevMap };
					delete copy[clearedName];
					return copy;
				});
			}

			// In Advanced mode, clearing should keep the inner row visible.
			if (advancedMode) {
				setForcedEmpty((prev) => ({ ...prev, [index]: true }));
				setHideEmpty(false);
			}

			// after clearing, focus at start of this input
			setTimeout(() => {
				const ref = advancedMode
					? advancedInputRefs.current[index]
					: listInputRefs.current[index];
				if (ref) {
					ref.focus();
					ref.selectionStart = ref.selectionEnd = 0;
				}
				updateFocusedLine();
				setControlsTick((t) => t + 1);
			}, 0);
			return lines.join("\n");
		});
	};

	// Insert an empty line after the given index and focus the new input.
	// If the canonical `names` string was empty before insertion, mark the
	// new row as forced visible so Advanced-mode auto-hide does not remove it.
	const insertLineAfter = (index: number) => {
		const wasEmpty = (names || "").trim() === "";

		setNames((prev) => {
			const lines = prev.split("\n");
			lines.splice(index + 1, 0, "");
			const next = lines.join("\n");
			pushHistory(next);
			return next;
		});

		// If we inserted into an entirely empty names string OR we're in
		// Advanced mode, mark the new row as a forced-empty so the
		// advanced-controls div is rendered even when the text is empty.
		if (wasEmpty || advancedMode) {
			const newIndex = index + 1;
			setForcedEmpty((prev) => ({ ...prev, [newIndex]: true }));
			setHideEmpty(false);
		}

		setTimeout(() => {
			const newIndex = index + 1;
			const ref = advancedMode
				? advancedInputRefs.current[newIndex]
				: listInputRefs.current[newIndex];
			if (ref) {
				ref.focus();
				const len = ref.value.length;
				ref.selectionStart = ref.selectionEnd = len;
			}
			updateFocusedLine();
			setControlsTick((t) => t + 1);
		}, 0);
	};

	// Insert an empty line before the given index and focus the new input.
	const insertLineBefore = (index: number) => {
		setNames((prev) => {
			const lines = prev.split("\n");
			lines.splice(index, 0, "");
			const next = lines.join("\n");
			pushHistory(next);
			return next;
		});

		setTimeout(() => {
			const newIndex = index;
			const ref = advancedMode
				? advancedInputRefs.current[newIndex]
				: listInputRefs.current[newIndex];
			if (ref) {
				try {
					ref.focus();
					ref.selectionStart = ref.selectionEnd = 0;
				} catch {}
			}
			updateFocusedLine();
			setControlsTick((t) => t + 1);
		}, 0);
	};

	const handleKeyDownInsert = (
		e: React.KeyboardEvent<HTMLInputElement>,
		index: number
	) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// If not in Advanced mode and caret is at start, insert above current line
			if (!advancedMode) {
				try {
					const caret =
						(e.currentTarget as HTMLInputElement).selectionStart ?? 0;
					if (caret === 0) {
						insertLineBefore(index);
						return;
					}
				} catch {}
			}
			insertLineAfter(index);
		}
	};

	const ICON_DIV_WIDTH = 70; // px; used to calculate input width (icons container)
	const [hideEmpty, setHideEmpty] = useState(false);

	// Track indices for which an empty advanced inner row should be shown even
	// when the canonical `names` string is empty. Used to avoid auto-hide races.
	const [forcedEmpty, setForcedEmpty] = useState<Record<number, boolean>>({});

	// Delete a line entirely from the names list and focus the next sensible input
	const deleteLine = (index: number) => {
		setNames((prev) => {
			const lines = prev.split("\n");
			const removed = (lines[index] || "").trim();
			if (index >= 0 && index < lines.length) {
				lines.splice(index, 1);
			}
			// remove includeMap entry for removed name
			if (removed) {
				setIncludeMap((prevMap) => {
					const copy = { ...prevMap };
					delete copy[removed];
					return copy;
				});
			}
			const next = lines.join("\n");
			// If no lines left after deletion, hide the empty input area
			setHideEmpty(lines.length === 0);

			// Shift forcedEmpty indices down for entries after the removed index
			setForcedEmpty((prev) => {
				const copy: Record<number, boolean> = {};
				Object.keys(prev).forEach((k) => {
					const num = Number(k);
					if (isNaN(num)) return;
					if (num < index) copy[num] = true;
					else if (num > index) copy[num - 1] = true;
				});
				return copy;
			});
			pushHistory(next);
			// focus next element after DOM updates
			setTimeout(() => {
				const newIndex = Math.min(index, Math.max(0, lines.length - 1));
				const ref = advancedMode
					? advancedInputRefs.current[newIndex]
					: listInputRefs.current[newIndex];
				if (ref) {
					ref.focus();
					const len = ref.value.length;
					ref.selectionStart = ref.selectionEnd = len;
				}
				updateFocusedLine();
				setControlsTick((t) => t + 1);
			}, 0);
			return next;
		});
	};

	// When an advanced-mode input receives focus, remove any other empty lines
	// (whitespace-only) from the names list, but keep the focused line.
	const handleAdvancedFocus = (index: number) => {
		const lines = names.split("\n");
		// detect empty lines other than the focused one
		const emptyOthers = lines.some((l, i) => i !== index && l.trim() === "");
		if (!emptyOthers) {
			setFocusedLine(index);
			setControlsTick((t) => t + 1);
			return;
		}

		// Count how many empty lines occur before the focused index so we can
		// compute the new index after compaction.
		const removedBefore = lines
			.slice(0, index)
			.filter((l) => l.trim() === "").length;

		const kept: string[] = [];
		for (let i = 0; i < lines.length; i++) {
			if (i !== index && lines[i].trim() === "") continue;
			kept.push(lines[i]);
		}

		const newValue = kept.join("\n");

		// Remap forcedEmpty indices to the compacted list so any intentionally
		// visible empty advanced rows are preserved at their new indices.
		setForcedEmpty((prev) => {
			const newMap: Record<number, boolean> = {};
			let writeIndex = 0;
			for (let i = 0; i < lines.length; i++) {
				if (i !== index && lines[i].trim() === "") continue;
				if (prev[i]) newMap[writeIndex] = true;
				writeIndex += 1;
			}
			return newMap;
		});

		setNames(newValue);

		const newIndex = index - removedBefore;
		// Restore focus to the corresponding input after DOM updates
		setTimeout(() => {
			const el = advancedInputRefs.current[newIndex];
			if (el) {
				el.focus();
				const len = el.value.length;
				el.selectionStart = el.selectionEnd = len;
			}
			setFocusedLine(newIndex);
			setControlsTick((t) => t + 1);
		}, 0);
	};

	// When a names-list input (non-advanced mode) receives focus, remove any other
	// empty lines (whitespace-only) but keep the focused line. Mirrors
	// `handleAdvancedFocus` behavior for the names-list view.
	const handleListFocus = (index: number) => {
		const lines = names.split("\n");
		const emptyOthers = lines.some((l, i) => i !== index && l.trim() === "");
		if (!emptyOthers) {
			setFocusedLine(index);
			setControlsTick((t) => t + 1);
			return;
		}

		const removedBefore = lines
			.slice(0, index)
			.filter((l) => l.trim() === "").length;
		const kept: string[] = [];
		for (let i = 0; i < lines.length; i++) {
			if (i !== index && lines[i].trim() === "") continue;
			kept.push(lines[i]);
		}

		const newValue = kept.join("\n");
		setNames(newValue);

		const newIndex = index - removedBefore;
		setTimeout(() => {
			const el = listInputRefs.current[newIndex];
			if (el) {
				el.focus();
				const len = el.value.length;
				el.selectionStart = el.selectionEnd = len;
			}
			setFocusedLine(newIndex);
			setControlsTick((t) => t + 1);
		}, 0);
	};

	// Edit a specific line's text (Advanced mode). Updates names and keeps includeMap in sync.
	const editLine = (index: number, newText: string) => {
		setNames((prev) => {
			const lines = prev.split("\n");
			const oldTrim = (lines[index] || "").trim();
			lines[index] = newText;
			const newTrim = newText.trim();

			// Update includeMap based on the old trimmed name, preserving the flag if present
			setIncludeMap((prevMap) => {
				const copy = { ...prevMap };
				if (oldTrim && copy[oldTrim] !== undefined) {
					const v = copy[oldTrim];
					delete copy[oldTrim];
					if (newTrim) copy[newTrim] = v;
				} else if (newTrim && copy[newTrim] === undefined) {
					copy[newTrim] = true;
				}
				return copy;
			});

			return lines.join("\n");
		});
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

	// Toggle the `spinning-block` class on <body> to globally disable pointer-events
	useEffect(() => {
		if (typeof document === "undefined") return;
		if (spinning) document.body.classList.add("spinning-block");
		else document.body.classList.remove("spinning-block");

		return () => {
			document.body.classList.remove("spinning-block");
		};
	}, [spinning]);

	// Ensure the cursor shows as `wait` while spinning even when many elements
	// have `pointer-events: none`. Store and restore the previous body cursor.
	useEffect(() => {
		if (typeof document === "undefined") return;
		const prev = document.body.style.cursor;
		if (spinning) {
			document.body.style.cursor = "wait";
		} else {
			document.body.style.cursor = prev || "";
		}

		return () => {
			document.body.style.cursor = prev || "";
		};
	}, [spinning]);

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

	// Per-partition images: blob URLs stored by index and bitmap cache for drawing
	const [partitionImages, setPartitionImages] = useState<
		Record<number, string>
	>({});
	// Legacy index-keyed images remain for fallback, but introduce id-keyed maps
	const partitionImageBitmapRefs = useRef<Record<number, ImageBitmap | null>>(
		{}
	);
	const [partitionImagesById, setPartitionImagesById] = useState<
		Record<string, string>
	>({});
	const [partitionColorsById, setPartitionColorsById] = useState<
		Record<string, string>
	>({});

	// Per-partition weights: legacy index-keyed and id-keyed maps.
	// Each partition defaults to weight 1 when no explicit weight is set.
	const [partitionWeights, setPartitionWeights] = useState<
		Record<number, number>
	>({});
	const [partitionWeightsById, setPartitionWeightsById] = useState<
		Record<string, number>
	>({});

	// Refs mirroring the weight states for synchronous reads during drag events
	const partitionWeightsRef = useRef<Record<number, number>>({});
	const partitionWeightsByIdRef = useRef<Record<string, number>>({});

	// Keep refs in sync with state so we can read current values synchronously
	useEffect(() => {
		partitionWeightsRef.current = partitionWeights;
		partitionWeightsByIdRef.current = partitionWeightsById;
		// redraw immediately when weights change
		drawWheelRef.current?.();
	}, [partitionWeights, partitionWeightsById]);

	// ImageBitmap, blob url and contrast caches keyed by stable entry id
	const partitionImageBitmapByIdRef = useRef<
		Record<string, ImageBitmap | null>
	>({});
	const partitionImageBlobUrlsByIdRef = useRef<Record<string, string | null>>(
		{}
	);
	const partitionImageContrastByIdRef = useRef<Record<string, string>>({});
	// Cache simple contrast ("#ffffff" or "#000000") per-partition image to
	// decide text stroke/shadow color when drawing text over a partition image.
	const partitionImageContrastRef = useRef<Record<number, string>>({});
	const partitionImageBlobUrlsRef = useRef<Record<number, string | null>>({});
	// Stable per-entry ids for renderLines. Kept in state+ref for handlers.
	const [lineIds, setLineIds] = useState<string[]>([]);
	const lineIdsRef = useRef<string[]>([]);
	const idCounterRef = useRef<number>(1);

	// Hidden file input for per-partition image selection
	const entryFileInputRef = useRef<HTMLInputElement | null>(null);
	const pendingPartitionIndexForFileRef = useRef<number | null>(null);

	const onEntryFileSelected = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const f = e.target.files?.[0];
		if (!f) return;
		const idx = pendingPartitionIndexForFileRef.current;
		if (idx == null) return;
		// Do not revoke the previous blob synchronously (it may still be used by
		// an in-flight loader). Instead queue it for deferred revocation and
		// clear the bitmap cache for this index so the loader re-decodes the
		// newly selected image.
		try {
			const prev = partitionImageBlobUrlsRef.current[idx];
			if (prev && typeof prev === "string") {
				if (prev.startsWith && prev.startsWith("blob:")) {
					pendingBlobRevocationsRef.current.add(prev);
				}
			}
		} catch {}
		// clear any cached bitmap so loader will reload
		partitionImageBitmapRefs.current[idx] = null;
		const url = URL.createObjectURL(f);
		const id = lineIdsRef.current?.[idx];
		if (id) {
			partitionImageBlobUrlsByIdRef.current[id] = url;
			partitionImageBitmapByIdRef.current[id] = null;
			setPartitionImagesById((prev) => ({ ...prev, [id]: url }));
		} else {
			// fallback to index-keyed behavior
			partitionImageBlobUrlsRef.current[idx] = url;
			setPartitionImages((prev) => ({ ...prev, [idx]: url }));
		}
		pendingPartitionIndexForFileRef.current = null;
		// reset the file input so same file can be selected again
		try {
			e.currentTarget.value = "";
		} catch {}
		// load bitmap will be handled by effect below which watches partitionImages
	};

	// Upload helper: hidden file input and blob URL tracking for uploaded wheel image
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const uploadedBlobUrlRef = useRef<string | null>(null);
	// Track uploaded fullpage background blob URL so we can revoke when replaced
	const uploadedBgUrlRef = useRef<string | null>(null);

	const onWheelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;
		// revoke previous blob URL if any
		if (uploadedBlobUrlRef.current) {
			try {
				URL.revokeObjectURL(uploadedBlobUrlRef.current);
			} catch {}
		}
		const url = URL.createObjectURL(f);
		uploadedBlobUrlRef.current = url;
		// Use uploaded image as wheel image directly
		setWheelImageSrc(url);
	};

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
			// compute contrast for the selected color and apply softened text color
			try {
				const contrast = computeContrastFromColor(backgroundSelection.value);
				const softened =
					contrast === "#ffffff"
						? "rgba(255,255,255,0.94)"
						: "rgba(0,0,0,0.92)";
				document.body.style.color = softened;
				setBodyBgIsColor(true);
				setBodyBgIsImage(false);
				setBodyContrast(contrast);
				setBodyTextColor(softened);
			} catch (err) {
				console.warn("Failed to compute contrast for color background:", err);
			}
		} else if (backgroundSelection?.type === "image") {
			// If the selected image is a fullpage image (or an uploaded blob URL),
			// set the body background. If it's a wheel image, use it to fill wheel partitions.
			const val = backgroundSelection.value || "";
			const isUploadedFullpage = val && val.startsWith("blob:");
			// Revoke any previous uploaded background blob URL when replacing
			if (
				uploadedBgUrlRef.current &&
				uploadedBgUrlRef.current !== val &&
				uploadedBgUrlRef.current.startsWith("blob:")
			) {
				try {
					URL.revokeObjectURL(uploadedBgUrlRef.current);
				} catch {}
				uploadedBgUrlRef.current = null;
			}

			if (val.includes("/images/fullpage/") || isUploadedFullpage) {
				// If this was an uploaded fullpage background, remember it so we can
				// revoke it later when replaced.
				if (isUploadedFullpage) uploadedBgUrlRef.current = val;
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
						setBodyBgIsColor(false);
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
			setBodyBgIsColor(false);
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

			// Revoke any uploaded background blob URL on unmount
			if (
				uploadedBgUrlRef.current &&
				uploadedBgUrlRef.current.startsWith("blob:")
			) {
				try {
					URL.revokeObjectURL(uploadedBgUrlRef.current);
				} catch {}
				uploadedBgUrlRef.current = null;
			}
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

	// Per-partition custom colors (advanced mode color picker)
	const [partitionColors, setPartitionColors] = useState<
		Record<number, string>
	>({});

	// Single hidden page-level color input (reuse the same technique as the
	// Backgrounds menu) so the native color palette opens reliably at a
	// predictable position. We keep an index ref so the shared input knows
	// which partition to update on change.
	const pageColorInputRef = useRef<HTMLInputElement | null>(null);
	const pendingPartitionIndexRef = useRef<number | null>(null);

	const openColorPickerFor = useCallback(
		(idx: number, anchor?: HTMLElement) => {
			try {
				const el = pageColorInputRef.current;
				if (!el) return;

				pendingPartitionIndexRef.current = idx;

				// Prefer id-keyed color when available so the native picker reflects
				// the user's persisted choice for this logical entry.
				const id = lineIdsRef.current?.[idx];
				const existing = id
					? partitionColorsById[id] ??
					  partitionColors[idx] ??
					  colors[idx % colors.length]
					: partitionColors[idx] ?? colors[idx % colors.length];
				el.value = existing || "#ffffff";

				if (anchor) {
					const r = anchor.getBoundingClientRect();
					const left = Math.round(r.left + r.width / 2);
					// try to place below the button
					let desiredTop = Math.round(r.bottom + 6);
					if (desiredTop + 30 > window.innerHeight) {
						// not enough room below; place above the button
						desiredTop = Math.max(8, Math.round(r.top - 36));
					}
					const top = Math.min(
						window.innerHeight - 12,
						Math.max(8, desiredTop)
					);

					el.style.position = "fixed";
					el.style.left = `${left}px`;
					el.style.top = `${top}px`;
					el.style.width = `28px`;
					el.style.height = `28px`;
					el.style.opacity = "0";
					el.style.transform = "translate(-50%, 0)";
					el.style.zIndex = "2147483647";
					el.style.pointerEvents = "auto";
					el.tabIndex = -1;
				}

				try {
					// Prefer showPicker if available, otherwise click()
					if (typeof (el as any).showPicker === "function")
						(el as any).showPicker();
					else el.click();
				} catch (e) {
					// ignore
				}
			} catch (err) {
				console.warn("openColorPickerFor failed:", err);
			}
		},
		[colors, partitionColors, partitionColorsById]
	);

	// Color picker is opened via ephemeral native input; no closeColorPicker needed.

	// (Removed positioned picker handlers — we open native palette directly.)

	const drawWheel = useCallback(() => {
		const canvas = canvasRef.current;
		// if (!canvas || namesList.length === 0) return;
		// Use placeholder segments if no names entered
		const displayList =
			namesList.length > 0
				? namesList
				: //  : ["Add", "Names", "Here", "To", "Start", "Spinning"];
				  [""];

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
		// Compute per-partition weights (id-keyed first, then index-keyed), default 1
		const weights = displayList.map((_, i) => {
			const id = lineIds[i];
			const w = id
				? partitionWeightsByIdRef.current[id] ?? partitionWeightsRef.current[i]
				: partitionWeightsRef.current[i];
			return Number(w ?? 1);
		});

		const totalWeight = Math.max(
			1,
			weights.reduce((a, b) => a + b, 0)
		);

		// Accumulator angle starts at the global rotation
		let accAngle = (rotation * Math.PI) / 180;

		for (let index = 0; index < displayList.length; index++) {
			const name = displayList[index];
			const weight = weights[index] ?? 1;
			const angle = (weight / totalWeight) * (2 * Math.PI);
			const startAngle = accAngle;
			const endAngle = startAngle + angle;
			const midAngle = startAngle + angle / 2;
			// advance accumulator for next slice
			accAngle = endAngle;

			// Build the sector path
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx.closePath();

			// Resolve stable id for this index (if available) and prefer id-keyed images/colors
			const id = lineIds[index];
			const pImg = id
				? partitionImageBitmapByIdRef.current[id]
				: partitionImageBitmapRefs.current[index];
			if (pImg) {
				ctx.save();
				// Ensure the partition background color is painted under the image
				// so uploaded images do not make the partition appear transparent.
				try {
					ctx.beginPath();
					ctx.moveTo(centerX, centerY);
					ctx.arc(centerX, centerY, radius, startAngle, endAngle);
					ctx.closePath();
					ctx.fillStyle =
						(id ? partitionColorsById[id] : undefined) ??
						partitionColors[index] ??
						colors[index % colors.length];
					ctx.fill();
				} catch (fillErr) {
					// ignore fill failures
				}
				ctx.clip();
				try {
					// place image centered along the sector radius (center of the partition)
					// Always scale-down the image so it fits comfortably inside the wheel
					// midAngle computed per-slice for weighted segments
					// const midAngle already available above
					const iw = pImg.width;
					const ih = pImg.height;
					// Adjust max allowed image size by partition angular size so
					// larger partitions get proportionally larger images.
					const angleDeg = (angle * 180) / Math.PI;
					// scale factor: small slices -> 0.7, large slices -> up to 1.4
					const sizeFactor = Math.min(1.4, Math.max(0.7, angleDeg / 30));
					const baseMax = radius * 0.4;
					const maxW = baseMax * sizeFactor;
					const maxH = baseMax * sizeFactor;
					const scale = Math.min(1, maxW / iw, maxH / ih);
					// ensure a reasonable minimum pixel size so images remain legible
					const dw = Math.max(12, Math.round(iw * scale));
					const dh = Math.max(12, Math.round(ih * scale));
					// compute half-diagonal radius of scaled image
					const imgRadius = Math.hypot(dw / 2, dh / 2);
					// maximum center distance so image stays inside wheel (small margin)
					const maxCenterDist = Math.max(0, radius - imgRadius - 6);
					// preferred placement slightly outward so image doesn't crowd the center
					// move image a bit closer to the wheel edge
					const preferredDist = radius * 0.68;
					const imgCenterDist = Math.min(preferredDist, maxCenterDist);
					const cx = centerX + Math.cos(midAngle) * imgCenterDist - dw / 2;
					const cy = centerY + Math.sin(midAngle) * imgCenterDist - dh / 2;
					// Draw image rotated so it remains perpendicular to the text.
					// We translate to the computed partition center and rotate by
					// (midAngle + 90deg) so the image stays perpendicular to text.
					ctx.save();
					try {
						// re-create/ensure the sector clip so image stays within the wedge
						ctx.beginPath();
						ctx.moveTo(centerX, centerY);
						ctx.arc(centerX, centerY, radius, startAngle, endAngle);
						ctx.closePath();
						ctx.clip();

						// position relative to center
						const xPos = Math.cos(midAngle) * imgCenterDist;
						const yPos = Math.sin(midAngle) * imgCenterDist;

						// move to image center, rotate so image has same orientation
						// as the text (0° relative to the text), then draw centered.
						ctx.translate(centerX + xPos, centerY + yPos);
						ctx.rotate(midAngle);

						// Clip into a rounded rectangle so the image has a soft
						// rounded border. Radius fixed at 7px as requested.
						try {
							const rr = 7; // corner radius in pixels
							const x0 = -dw / 2;
							const y0 = -dh / 2;
							const w = dw;
							const h = dh;
							const rx = Math.min(rr, w / 2);
							const ry = Math.min(rr, h / 2);
							ctx.beginPath();
							ctx.moveTo(x0 + rx, y0);
							ctx.lineTo(x0 + w - rx, y0);
							ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + ry);
							ctx.lineTo(x0 + w, y0 + h - ry);
							ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rx, y0 + h);
							ctx.lineTo(x0 + rx, y0 + h);
							ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - ry);
							ctx.lineTo(x0, y0 + ry);
							ctx.quadraticCurveTo(x0, y0, x0 + rx, y0);
							ctx.closePath();
							ctx.clip();
						} catch (err) {
							// if rounded clip fails for any reason, fallback to drawing normally
							console.warn("Rounded clip failed:", err);
						}

						ctx.drawImage(pImg, -dw / 2, -dh / 2, dw, dh);
					} finally {
						ctx.restore();
					}
				} catch (e) {
					console.warn("Failed to draw partition image:", e);
				}
				ctx.restore();
			} else if (wheelImageBitmapRef.current) {
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
				// prefer custom partition color when present (id-keyed first)
				const idColor = id ? partitionColorsById[id] : undefined;
				ctx.fillStyle =
					idColor ?? partitionColors[index] ?? colors[index % colors.length];
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
			ctx.rotate(startAngle + angle / 2);
			ctx.textAlign = "center";
			// Determine the final text color for this partition. Use the global
			// `wheelTextColor` by default, but if a per-partition image exists,
			// prefer the cached per-partition contrast (black/white). If the
			// cached contrast is missing, compute it synchronously from the
			// ImageBitmap so the text color updates immediately.
			let finalTextColor =
				namesList.length === 0 ? "rgba(0, 0, 0, 0.4)" : wheelTextColor;
			if (id && partitionImageBitmapByIdRef.current[id]) {
				finalTextColor =
					partitionImageContrastByIdRef.current[id] || finalTextColor;
				if (!partitionImageContrastByIdRef.current[id]) {
					try {
						finalTextColor =
							computeContrastFromBitmap(
								partitionImageBitmapByIdRef.current[id] as ImageBitmap
							) || finalTextColor;
						// cache it for subsequent draws
						partitionImageContrastByIdRef.current[id] = finalTextColor;
					} catch (e) {
						// ignore - keep default
					}
				}
			} else if (partitionImageBitmapRefs.current[index]) {
				finalTextColor =
					partitionImageContrastRef.current[index] || finalTextColor;
				if (!partitionImageContrastRef.current[index]) {
					try {
						finalTextColor =
							computeContrastFromBitmap(
								partitionImageBitmapRefs.current[index] as ImageBitmap
							) || finalTextColor;
						// cache it for subsequent draws
						partitionImageContrastRef.current[index] = finalTextColor;
					} catch (e) {
						// ignore - keep default
					}
				}
			}
			ctx.fillStyle = finalTextColor;

			// Calculate base font size based on canvas size (responsive)
			const baseFontSize = Math.max(12, Math.round(radius / 20));

			// Scale by partition size with boost for many names (8+)
			const angleDegrees = (angle * 180) / Math.PI;
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

			// If a wheel image or a per-partition image is present under this
			// text, draw a subtle contrasting stroke and shadow to ensure
			// legibility against the image.
			const hasImageUnderText =
				!!wheelImageBitmapRef.current ||
				!!(id
					? partitionImageBitmapByIdRef.current[id]
					: partitionImageBitmapRefs.current[index]);
			if (hasImageUnderText) {
				// Prefer contrast computed for wheel image; fall back to cached
				// per-partition contrast if present.
				const contrastColor = wheelImageBitmapRef.current
					? wheelTextColor
					: id
					? partitionImageContrastByIdRef.current[id] ||
					  wheelTextColor ||
					  "#000000"
					: partitionImageContrastRef.current[index] ||
					  wheelTextColor ||
					  "#000000";

				const isTextWhite =
					(contrastColor || "").toLowerCase() === "#ffffff" ||
					(contrastColor || "").toLowerCase() === "#fff";

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
		}

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
	}, [
		namesList,
		rotation,
		colors,
		spinning,
		wheelTextColor,
		partitionColors,
		lineIds,
		partitionColorsById,
	]);

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

	// Load any partition images into ImageBitmaps for faster drawing (id-keyed)
	useEffect(() => {
		let mounted = true;
		const toLoad: Array<[string, string]> = [];
		const ids = lineIdsRef.current ?? [];
		ids.forEach((id, idx) => {
			const src = partitionImagesById[id] ?? partitionImages[idx];
			if (!src) return;
			if (
				partitionImageBlobUrlsByIdRef.current[id] !== src ||
				!partitionImageBitmapByIdRef.current[id]
			) {
				toLoad.push([id, src]);
			}
		});
		if (toLoad.length === 0) return;
		(async () => {
			for (const [id, src] of toLoad) {
				try {
					// re-check that the requested src is still the active one for this id/index
					const currentIdx = (lineIdsRef.current ?? []).indexOf(id);
					const currentSrc =
						currentIdx >= 0
							? partitionImagesById[id] ?? partitionImages[currentIdx]
							: partitionImagesById[id];
					if (currentSrc !== src) continue;
					const res = await fetch(src);
					const blob = await res.blob();
					const bmp = await createImageBitmap(blob);
					if (!mounted) break;
					// Another guard: ensure the src hasn't changed while we fetched/decoded
					const stillSrc =
						currentIdx >= 0
							? partitionImagesById[id] ?? partitionImages[currentIdx]
							: partitionImagesById[id];
					if (stillSrc !== src) {
						try {
							if (src.startsWith && src.startsWith("blob:"))
								pendingBlobRevocationsRef.current.add(src);
						} catch {}
						continue;
					}
					partitionImageBitmapByIdRef.current[id] = bmp;
					// record the blob url as the active one for this id
					partitionImageBlobUrlsByIdRef.current[id] = src;
					try {
						partitionImageContrastByIdRef.current[id] =
							computeContrastFromBitmap(bmp) || "#000000";
					} catch (err) {
						partitionImageContrastByIdRef.current[id] = "#000000";
					}
					drawWheelRef.current?.();
				} catch (err) {
					console.warn("Failed to load partition image", src, err);
				}
			}
		})();
		return () => {
			mounted = false;
		};
	}, [partitionImagesById, partitionImages, lineIds]);

	const determineWinner = useCallback(
		(finalRotation: number) => {
			if (namesList.length === 0) return;

			// Compute weights (id-keyed first, then index) and find which
			// partition contains the adjusted rotation angle.
			const weights = namesList.map((_, i) => {
				const id = lineIds[i];
				const w = id
					? partitionWeightsByIdRef.current[id] ??
					  partitionWeightsRef.current[i]
					: partitionWeightsRef.current[i];
				return Number(w ?? 1);
			});
			const totalWeight = Math.max(
				1,
				weights.reduce((a, b) => a + b, 0)
			);

			// The arrow points to the right (0 degrees). Convert finalRotation
			// into an angle in degrees pointing at the wheel and find the slice.
			const adjustedRotation = (360 - (finalRotation % 360)) % 360;

			let acc = 0;
			let winnerIndex = 0;
			for (let i = 0; i < namesList.length; i++) {
				const segDeg = (weights[i] / totalWeight) * 360;
				if (adjustedRotation >= acc && adjustedRotation < acc + segDeg) {
					winnerIndex = i;
					break;
				}
				acc += segDeg;
			}

			setWinner(namesList[winnerIndex]);
			setShowDialog(true);
		},
		[namesList, lineIds, partitionWeights, partitionWeightsById]
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

			// Detect segment change and play sound (use weighted segments)
			const adjustedRotation = (360 - (currentRotation % 360)) % 360;
			const weightsForDetect = namesList.map((_, i) => {
				const id = lineIds[i];
				const w = id
					? partitionWeightsByIdRef.current[id] ??
					  partitionWeightsRef.current[i]
					: partitionWeightsRef.current[i];
				return Number(w ?? 1);
			});
			const totalWForDetect = Math.max(
				1,
				weightsForDetect.reduce((a, b) => a + b, 0)
			);
			let accForDetect = 0;
			let currentSegment = 0;
			for (let i = 0; i < namesList.length; i++) {
				const segDeg = (weightsForDetect[i] / totalWForDetect) * 360;
				if (
					adjustedRotation >= accForDetect &&
					adjustedRotation < accForDetect + segDeg
				) {
					currentSegment = i;
					break;
				}
				accForDetect += segDeg;
			}

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
	}, [
		spinning,
		namesList.length,
		rotation,
		determineWinner,
		timerDuration,
		lineIds,
		partitionWeights,
		partitionWeightsById,
		namesList,
	]);

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

	// Lines used for rendering lists. When `names` is empty we normally hide
	// the placeholder row (when `hideEmpty`), but if the user has forced one
	// or more empty advanced rows to be visible, we render those instead.
	const renderLines = useMemo(() => {
		if (names === "") {
			const forcedKeys = Object.keys(forcedEmpty)
				.map((k) => Number(k))
				.filter((n) => !isNaN(n));
			if (hideEmpty && forcedKeys.length === 0) return [];
			if (forcedKeys.length === 0) return [""];
			const maxIndex = forcedKeys.reduce((a, b) => Math.max(a, b), -1);
			return Array.from({ length: Math.max(1, maxIndex + 1) }).map(() => "");
		}
		return names.split("\n");
	}, [names, hideEmpty, forcedEmpty]);

	// Keep previous renderLines snapshot to perform deterministic remapping
	const prevRenderLinesRef = useRef<string[] | null>(null);
	// Queue of blob URLs pending revocation (deferred to avoid races)
	const pendingBlobRevocationsRef = useRef<Set<string>>(new Set());

	// Initialize prevRenderLinesRef on mount so the first change has a valid
	// "previous" snapshot to compare against. This prevents the remap from
	// treating the previous list as empty on the very first mutation.
	useEffect(() => {
		if (prevRenderLinesRef.current == null)
			prevRenderLinesRef.current = renderLines.slice();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// When the list of rendered lines changes, remap index-keyed partitionImages
	// into the new indices deterministically to avoid duplicating a single
	// blob URL into multiple destinations (which caused image bleed).
	useEffect(() => {
		const prev = prevRenderLinesRef.current ?? [];
		const next = renderLines;
		// Build stable per-line ids preserving previous ids when possible.
		const prevIds = lineIdsRef.current ?? [];
		const newIds: string[] = Array.from({ length: next.length }).map(() => "");
		const usedPrevIds = new Set<string>();

		// 1) Reuse id at same index when name unchanged
		for (let i = 0; i < next.length; i++) {
			if (prevIds[i] && prev[i] === next[i]) {
				newIds[i] = prevIds[i];
				usedPrevIds.add(prevIds[i]);
			}
		}

		// 2) Reuse ids by name match (first available)
		for (let i = 0; i < next.length; i++) {
			if (newIds[i]) continue;
			for (let oi = 0; oi < prev.length; oi++) {
				const pid = prevIds[oi];
				if (!pid) continue;
				if (usedPrevIds.has(pid)) continue;
				if (prev[oi] === next[i]) {
					newIds[i] = pid;
					usedPrevIds.add(pid);
					break;
				}
			}
		}

		// 3) Assign new ids where none matched
		for (let i = 0; i < next.length; i++) {
			if (!newIds[i]) {
				newIds[i] = `line-${idCounterRef.current++}`;
			}
		}

		// Commit ids
		setLineIds(newIds);
		lineIdsRef.current = newIds;
		// Snapshot previous index->url map
		const prevBlobMap = { ...partitionImageBlobUrlsRef.current } as Record<
			number,
			string | null
		>;

		// If nothing to remap, just update snapshot and return
		if (Object.keys(prevBlobMap).length === 0) {
			prevRenderLinesRef.current = next.slice();
			return;
		}

		const result: Record<number, string> = {};
		const usedOldIdx = new Set<number>();
		const usedUrls = new Set<string>();

		const tryAssign = (dest: number, url?: string) => {
			if (!url) return false;
			if (usedUrls.has(url)) return false;
			result[dest] = url;
			usedUrls.add(url);
			return true;
		};

		// 1) Prefer explicit current assignment (user already set partitionImages[dest])
		for (let dest = 0; dest < next.length; dest++) {
			const src = partitionImages[dest];
			if (src && tryAssign(dest, src)) continue;
		}

		// 2) Match by exact name: if a previous slot with the same name had an image,
		// assign it to the new destination (first-match). This preserves intent
		// when entries are reordered but keep the same text.
		for (let dest = 0; dest < next.length; dest++) {
			if (result[dest]) continue;
			for (let oi = 0; oi < prev.length; oi++) {
				if (usedOldIdx.has(oi)) continue;
				if ((prev[oi] || "") === (next[dest] || "")) {
					const url = prevBlobMap[oi];
					if (url && tryAssign(dest, url)) {
						usedOldIdx.add(oi);
						break;
					}
				}
			}
		}

		// 3) Fallback: preserve order — assign remaining old blobs to earliest
		// unfilled destinations in index order (stable, deterministic).
		for (let oi = 0; oi < prev.length; oi++) {
			if (usedOldIdx.has(oi)) continue;
			const url = prevBlobMap[oi];
			if (!url) continue;
			// find first unassigned dest
			for (let dest = 0; dest < next.length; dest++) {
				if (!result[dest]) {
					if (tryAssign(dest, url)) {
						usedOldIdx.add(oi);
						break;
					}
				}
			}
		}

		// Build new blob & bitmap refs according to result map
		const newBlobMap: Record<number, string | null> = {};
		const newBitmapMap: Record<number, ImageBitmap | null> = {};
		// Build url -> bitmap snapshot for reuse (include both legacy index
		// keyed caches and new id-keyed caches so we don't lose decoded bitmaps)
		const urlToBitmap = new Map<string, ImageBitmap | null>();
		Object.keys(partitionImageBlobUrlsRef.current).forEach((k) => {
			const i = Number(k);
			const u = partitionImageBlobUrlsRef.current[i];
			if (u && partitionImageBitmapRefs.current[i]) {
				urlToBitmap.set(u, partitionImageBitmapRefs.current[i]);
			}
		});
		Object.keys(partitionImageBlobUrlsByIdRef.current).forEach((k) => {
			const id = k;
			const u = partitionImageBlobUrlsByIdRef.current[id];
			if (u && partitionImageBitmapByIdRef.current[id]) {
				urlToBitmap.set(u, partitionImageBitmapByIdRef.current[id]);
			}
		});

		Object.keys(result).forEach((k) => {
			const dest = Number(k);
			const u = result[dest];
			if (u) {
				newBlobMap[dest] = u;
				newBitmapMap[dest] = urlToBitmap.has(u)
					? urlToBitmap.get(u) || null
					: null;
			}
		});

		// Queue orphaned blob urls for deferred revocation
		try {
			const prevUrls = Object.values(partitionImageBlobUrlsRef.current).filter(
				Boolean
			) as string[];
			const newUrls = Object.values(newBlobMap).filter(Boolean) as string[];
			for (const u of prevUrls) {
				if (!u) continue;
				if (!newUrls.includes(u) && u.startsWith && u.startsWith("blob:")) {
					pendingBlobRevocationsRef.current.add(u);
				}
			}
			// schedule cleanup
			setTimeout(() => {
				try {
					const currentUrls = Object.values(
						partitionImageBlobUrlsRef.current
					).filter(Boolean) as string[];
					const activeImagesIndex = Object.values(partitionImages).filter(
						Boolean
					) as string[];
					const activeImagesById = Object.values(partitionImagesById).filter(
						Boolean
					) as string[];
					const activeImages = [...activeImagesIndex, ...activeImagesById];
					for (const u of Array.from(pendingBlobRevocationsRef.current)) {
						if (!u) continue;
						if (currentUrls.includes(u) || activeImages.includes(u)) continue;
						try {
							URL.revokeObjectURL(u);
						} catch {}
						pendingBlobRevocationsRef.current.delete(u);
					}
				} catch {}
			}, 250);
		} catch {}

		// Apply remapped state (index->url maps) AND convert to id-keyed maps
		// Build id-keyed blob/url & bitmap maps using the newIds we generated above
		const newBlobById: Record<string, string | null> = {};
		const newBitmapById: Record<string, ImageBitmap | null> = {};
		Object.keys(newBlobMap).forEach((k) => {
			const dest = Number(k);
			const id = newIds[dest];
			if (id && newBlobMap[dest]) {
				newBlobById[id] = newBlobMap[dest];
				if (newBitmapMap[dest]) newBitmapById[id] = newBitmapMap[dest];
			}
		});

		// Keep legacy index-keyed maps for fallback
		partitionImageBlobUrlsRef.current = newBlobMap;
		partitionImageBitmapRefs.current = newBitmapMap;
		setPartitionImages((_) => {
			const out: Record<number, string> = {};
			Object.keys(newBlobMap).forEach((k) => {
				const i = Number(k);
				if (newBlobMap[i]) out[i] = newBlobMap[i] as string;
			});
			return out;
		});

		// Set id-keyed refs/state so draw/loader will use ids
		partitionImageBlobUrlsByIdRef.current = newBlobById;
		partitionImageBitmapByIdRef.current = newBitmapById;
		setPartitionImagesById((prev) => {
			const out = { ...prev };
			Object.keys(newBlobById).forEach((id) => {
				if (newBlobById[id]) out[id] = newBlobById[id] as string;
			});
			return out;
		});

		// Remap per-partition colors to id-keyed map so user-chosen colors stick
		try {
			const prevColorMap = { ...partitionColors } as Record<number, string>;
			const newColorById: Record<string, string> = {};
			const tryAssignColorToId = (dest: number, col?: string) => {
				if (!col) return false;
				const id = newIds[dest];
				if (!id) return false;
				if (Object.values(newColorById).includes(col)) return false;
				newColorById[id] = col;
				return true;
			};
			// 1) Prefer explicit current assignment
			for (let dest = 0; dest < next.length; dest++) {
				const src = partitionColors[dest];
				if (src && tryAssignColorToId(dest, src)) continue;
			}
			// 2) Match by previous name
			for (let dest = 0; dest < next.length; dest++) {
				if (newColorById[newIds[dest]]) continue;
				for (let oi = 0; oi < prev.length; oi++) {
					if ((prev[oi] || "") === (next[dest] || "")) {
						const c = prevColorMap[oi];
						if (c && tryAssignColorToId(dest, c)) break;
					}
				}
			}
			// 3) Fallback: preserve order
			for (let oi = 0; oi < prev.length; oi++) {
				const c = prevColorMap[oi];
				if (!c) continue;
				for (let dest = 0; dest < next.length; dest++) {
					if (!newColorById[newIds[dest]]) {
						if (tryAssignColorToId(dest, c)) break;
					}
				}
			}
			// Apply
			setPartitionColorsById((prev) => ({ ...prev, ...newColorById }));
		} catch (_) {
			// best-effort
		}

		prevRenderLinesRef.current = next.slice();
	}, [renderLines]);

	// If we start with an empty list, focus the first input line automatically.
	useEffect(() => {
		if (renderLines.length === 0) return;
		// focus when all lines are empty
		const hasNonEmpty = renderLines.some((l) => (l || "").trim() !== "");
		if (!hasNonEmpty) {
			setTimeout(() => {
				const ref = advancedMode
					? advancedInputRefs.current[0]
					: listInputRefs.current[0];
				if (ref) {
					try {
						ref.focus();
						ref.selectionStart = ref.selectionEnd = 0;
						setFocusedLine(0);
					} catch {}
				}
			}, 0);
		}
	}, [names, hideEmpty, advancedMode, renderLines]);

	// When switching to Advanced mode, keep the empty area hidden unless the
	// user has explicitly forced an empty inner row to be visible. This avoids
	// promoting the Normal-mode empty placeholder into Advanced mode unintentionally.
	useEffect(() => {
		if (!advancedMode) return;
		if ((names || "").trim() === "" && Object.keys(forcedEmpty).length === 0) {
			setHideEmpty(true);
		}
	}, [advancedMode, names, forcedEmpty]);

	// Helper to determine whether a pointer event occurred inside an existing
	// line element. Traverses DOM ancestors from event.target up to the
	// container; this is robust across mobile browsers that may not expose
	// `composedPath` or `path` on the native event.
	const isEventInsideLine = (e: React.PointerEvent) => {
		let node = e.target as HTMLElement | null;
		const container = e.currentTarget as HTMLElement | null;
		while (node && node !== container) {
			if (node.dataset && typeof node.dataset.lineIndex !== "undefined") {
				return true;
			}
			node = node.parentElement;
		}
		return false;
	};

	// Compute per-partition weights for rendering percentages (default 1)
	const getWeightForIndex = (i: number) => {
		const id = lineIds[i];
		const w = id
			? partitionWeightsByIdRef.current[id] ?? partitionWeightsRef.current[i]
			: partitionWeightsRef.current[i];
		return Number(w ?? 1);
	};

	const totalWeightForRender = Math.max(
		1,
		renderLines.reduce((acc, _ln, i) => acc + getWeightForIndex(i), 0)
	);

	return (
		<div className="min-h-screen">
			{/* Global rule: when spinning, add `spinning-block` to body so
			   pointer-events are disabled for all elements except those with
			   the `allow-fullscreen` class. This avoids z-index/stacking issues. */}
			{/* When spinning, render a full-screen overlay visually, but don't intercept pointer events
				— we will disable pointer-events on the main container instead and allow the fullscreen
				button to remain interactive via pointer-events-auto on that button. */}
			{spinning && (
				<div
					aria-hidden="true"
					className="fixed inset-0 z-50 bg-transparent pointer-events-none cursor-wait"
					// stop propagation to be safe (no-op when pointer-events-none)
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
			{/* Palette popover (anchored) */}
			{paletteOpenFor !== null && (
				<div
					ref={paletteRef}
					className="z-50 p-2 bg-white rounded shadow-lg border"
					style={{
						position: "fixed",
						left: "50%",
						top: "50%",
						transform: "translate(-50%, 0)",
					}}
				>
					<div className="grid grid-cols-5 gap-2">
						{paletteColors.map((c) => (
							<button
								type="button"
								key={c}
								aria-label={`Select color ${c}`}
								className="w-6 h-6 rounded-sm"
								style={{ background: c, border: "1px solid rgba(0,0,0,0.08)" }}
								onClick={() => handlePaletteSelect(paletteOpenFor as number, c)}
							/>
						))}
					</div>
					<div className="mt-2 flex gap-2 justify-center">
						<button
							type="button"
							className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 border"
							onClick={() => handlePaletteReset(paletteOpenFor as number)}
						>
							Reset
						</button>
					</div>
				</div>
			)}
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
			<style global jsx>{`
				body.spinning-block * {
					pointer-events: none !important;
					cursor: wait !important;
				}
				/* Make the fullscreen control interactive and show a pointer cursor */
				body.spinning-block .allow-fullscreen {
					pointer-events: auto !important;
					cursor: pointer !important;
				}
				/* Ensure any children of the fullscreen control also show pointer */
				body.spinning-block .allow-fullscreen * {
					cursor: wait !important;
				}
			`}</style>

			{/* Add/remove body class when spinning so the global CSS takes effect (handled in effect below) */}
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
			{/* Color picker opens via a single hidden native input so the native
				palette is shown using the browser's positioning (same technique as
				the Backgrounds menu). */}
			<input
				ref={pageColorInputRef}
				type="color"
				className="sr-only"
				onChange={(e) => {
					const val = e.currentTarget.value;
					const idx = pendingPartitionIndexRef.current;
					if (idx != null) {
						const id = lineIdsRef.current?.[idx];
						if (id) {
							setPartitionColorsById((prev) => ({ ...prev, [id]: val }));
							setPartitionColors((prev) => {
								const copy = { ...prev };
								delete copy[idx];
								return copy;
							});
						} else {
							setPartitionColors((prev) => ({ ...prev, [idx]: val }));
						}
						drawWheelRef.current?.();
						pendingPartitionIndexRef.current = null;
					}
				}}
				aria-label="Select partition color"
			/>
			{/* Hidden file input for per-partition Image selection (triggered by Image button) */}
			<input
				ref={entryFileInputRef}
				type="file"
				accept="image/*"
				style={{ display: "none" }}
				onChange={onEntryFileSelected}
				aria-hidden="true"
			/>
			<div className={`container mx-auto py-6`}>
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
										{/* Palette button intentionally not shown in title area */}
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
								className="hidden md:flex relative z-60 md:z-1 items-center gap-2 bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg transition-all duration-200 shadow-lg pointer-events-auto allow-fullscreen"
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
								className="text-center text-orange-400 font-bold mt-1 flex items-center gap-2 justify-center"
								style={getTextContrastStyles() || undefined}
							>
								<svg
									aria-hidden="true"
									className="w-5 h-5 shrink-0"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
									<line x1="12" y1="9" x2="12" y2="13" />
									<line x1="12" y1="17" x2="12.01" y2="17" />
								</svg>
								Enter names to spin the wheel
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
											<X
												size={40}
												className="text-yellow-900 hover:text-yellow-400"
											/>
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
						{/* Slider popover for per-partition weight (Share %) */}
						{sliderOpenFor !== null && (
							<div
								ref={sliderRef}
								className="z-50 p-3 bg-white rounded shadow-lg border"
								style={{
									position: "fixed",
									left: "50%",
									top: "50%",
									transform: "translate(-50%, 0)",
								}}
							>
								{(() => {
									const idx = sliderOpenFor as number;
									const id = lineIdsRef.current?.[idx];
									const current = id
										? partitionWeightsByIdRef.current[id] ??
										  partitionWeightsRef.current[idx] ??
										  1
										: partitionWeightsRef.current[idx] ?? 1;
									return (
										<div className="w-[260px] rounded-md">
											{(() => {
												const pct =
													totalWeightForRender > 0
														? Math.round((current / totalWeightForRender) * 100)
														: 0;
												return (
													<div className="text-sm font-medium mb-2 flex items-center justify-between">
														<div>Adjust weight ( 0–200 )</div>
														<div className="text-sm text-gray-600">
															( {pct}% win )
														</div>
													</div>
												);
											})()}
											<input
												type="range"
												min={0}
												max={200}
												value={current}
												onChange={(e) => {
													const val = Number(
														(e.target as HTMLInputElement).value || 0
													);
													if (id) {
														// update refs synchronously so draw uses latest value
														partitionWeightsByIdRef.current = {
															...partitionWeightsByIdRef.current,
															[id]: val,
														};
														setPartitionWeightsById((prev) => ({
															...prev,
															[id]: val,
														}));
														// remove any legacy index-keyed value
														partitionWeightsRef.current = {
															...partitionWeightsRef.current,
														};
														delete partitionWeightsRef.current[idx];
														setPartitionWeights((prev) => {
															// keep text input in sync with slider
															setSliderWeightText(String(val));
															const copy = { ...prev };
															delete copy[idx];
															return copy;
														});
													} else {
														partitionWeightsRef.current = {
															...partitionWeightsRef.current,
															[idx]: val,
														};
														setPartitionWeights((prev) => ({
															...prev,
															[idx]: val,
														}));
													}
													// draw immediately using refs
													drawWheelRef.current?.();
												}}
												className="w-full"
											/>
											<div className="mt-1 flex justify-between items-center">
												<div className="mt-2 text-sm">
													<label className="mr-2">Weight:</label>
													<input
														type="text"
														value={sliderWeightText}
														onChange={(e) => {
															const raw =
																(e.target as HTMLInputElement).value || "";
															// allow only digits while typing
															const filtered = raw.replace(/[^0-9]/g, "");
															setSliderWeightText(filtered);
															// parse numeric and update slider live
															let val = Number(filtered || "0");
															if (isNaN(val)) val = 0;
															val = Math.max(0, Math.min(200, Math.round(val)));
															if (id) {
																partitionWeightsByIdRef.current = {
																	...partitionWeightsByIdRef.current,
																	[id]: val,
																};
																setPartitionWeightsById((prev) => ({
																	...prev,
																	[id]: val,
																}));
																partitionWeightsRef.current = {
																	...partitionWeightsRef.current,
																};
																delete partitionWeightsRef.current[idx];
																setPartitionWeights((prev) => {
																	const copy = { ...prev };
																	delete copy[idx];
																	return copy;
																});
															} else {
																partitionWeightsRef.current = {
																	...partitionWeightsRef.current,
																	[idx]: val,
																};
																setPartitionWeights((prev) => ({
																	...prev,
																	[idx]: val,
																}));
															}
															drawWheelRef.current?.();
														}}
														onBlur={() => {
															let val = Number(sliderWeightText || "0");
															if (isNaN(val)) val = 0;
															val = Math.max(0, Math.min(200, Math.round(val)));
															if (id) {
																partitionWeightsByIdRef.current = {
																	...partitionWeightsByIdRef.current,
																	[id]: val,
																};
																setPartitionWeightsById((prev) => ({
																	...prev,
																	[id]: val,
																}));
																partitionWeightsRef.current = {
																	...partitionWeightsRef.current,
																};
																delete partitionWeightsRef.current[idx];
																setPartitionWeights((prev) => {
																	const copy = { ...prev };
																	delete copy[idx];
																	return copy;
																});
															} else {
																partitionWeightsRef.current = {
																	...partitionWeightsRef.current,
																	[idx]: val,
																};
																setPartitionWeights((prev) => ({
																	...prev,
																	[idx]: val,
																}));
															}
															// reflect normalized value back into the text input
															setSliderWeightText(String(val));
															drawWheelRef.current?.();
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																// commit value on Enter
																(e.target as HTMLInputElement).blur();
															}
														}}
														className="w-20 px-2 py-1 border rounded text-sm"
													/>
												</div>
												<div className="mt-2">
													<button
														type="button"
														className="px-2 py-1 text-white font-medium rounded bg-[#0671ff] hover:bg-blue-800 text-sm"
														onClick={() => {
															setSliderOpenFor(null);
															sliderAnchorRef.current = null;
														}}
													>
														Done
													</button>
												</div>
											</div>
										</div>
									);
								})()}
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
							<div className="flex flex-col items-start gap-4">
								{/* Right-side quick-order buttons (visible on all screens). Mirrors the names order radio options */}
								<div
									id="entries"
									role="radiogroup"
									aria-label="Quick name ordering"
									className="flex items-stretch gap-3 ml-1 w-24 flex-wrap w-full"
								>
									<button
										type="button"
										role="radio"
										aria-checked={nameOrder === "shuffle"}
										onClick={() => handleNamesOrderChange("shuffle")}
										className="flex items-center gap-2 px-2 py-1 rounded-sm text-sm text-white shadow justify-start"
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
										className="flex items-center gap-2 px-2 py-1 rounded-sm text-sm text-white shadow justify-start"
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
										className="flex items-center gap-2 px-2 py-1 rounded-sm text-sm text-white shadow justify-start"
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
												className="flex items-center gap-2 px-2 py-1 rounded-sm text-sm text-white shadow justify-start"
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
												<div className="flex items-center justify-between mb-3">
													<p className="text-muted-foreground text-xs uppercase tracking-wide">
														Choose wheel image
													</p>
													<div>
														<input
															ref={uploadInputRef}
															type="file"
															accept="image/*"
															onChange={onWheelImageUpload}
															style={{ display: "none" }}
														/>
														<button
															type="button"
															onClick={() => uploadInputRef.current?.click()}
															className="flex items-center gap-2 px-3 py-1 text-[13px] font-medium rounded-full text-xs text-white shadow justify-start"
															style={{
																background: "#008cbd",
																...(getButtonContrastStyles() || {}),
															}}
															aria-label="Upload wheel image"
														>
															<UploadCloud size={16} />
															<span>Upload Image</span>
														</button>
													</div>
												</div>
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
									<label className="flex items-center gap-2 ml-2">
										<input
											type="checkbox"
											checked={advancedMode}
											onChange={(e) => setAdvancedMode(e.target.checked)}
											className="w-4 h-4"
										/>
										<span className="text-sm">Advanced</span>
									</label>
								</div>

								{/* Normal mode  */}
								<div className="relative flex-1 w-full">
									{!advancedMode ? (
										<div className="w-full">
											<div
												role="region"
												aria-label="Names list"
												className="w-full  whitespace-pre rounded-[7px] bg-gray-50 text-gray-800 overflow-auto text-[18px] md:text-[19px] font-bold border-4 shadow-inner border-gray-300 px-3 pt-3 pb-8 leading-7 relative"
												/* Require double-click on empty area (outside inner divs)
												   to focus the last input or create a new one. Single click
												   no longer creates/focuses to avoid accidental mobile keyboards. */
												onPointerDown={(e) => {
													// If the event is inside a line, let that event proceed.
													if (isEventInsideLine(e)) return;
													// Otherwise do nothing on single pointer down.
												}}
												onClick={(e) => {
													// Only react when double-click occurred outside inner line elements
													// Walk up from target to container to detect a data-line-index
													let node = e.target as HTMLElement | null;
													const container =
														e.currentTarget as HTMLElement | null;
													while (node && node !== container) {
														if (
															node.dataset &&
															typeof (node.dataset as any).lineIndex !==
																"undefined"
														) {
															// double-click was inside a line; ignore
															return;
														}
														node = node.parentElement;
													}

													e.stopPropagation();

													// If no rendered lines exist, create one
													if (renderLines.length === 0) {
														setHideEmpty(false);
														insertLineAfter(-1);
														return;
													}

													// Focus the last existing inner input
													const lastIdx = renderLines.length - 1;
													const ref = advancedMode
														? advancedInputRefs.current[lastIdx]
														: listInputRefs.current[lastIdx];
													if (ref) {
														try {
															ref.focus();
															const len = ref.value.length;
															ref.selectionStart = ref.selectionEnd = len;
														} catch {}
													} else {
														// Fallback: if no ref found, create a new empty line
														insertLineAfter(lastIdx);
													}
												}}
												style={{
													// height: Math.min(
													// 	900,
													// 	Math.max(600, names.split("\n").length * 42 + 24)
													// ),
													// overflowY: "auto",
													width: textareaSize.width
														? textareaSize.width + "px"
														: undefined,
													height: textareaSize.height
														? textareaSize.height + "px"
														: undefined,
													minHeight: "500px",
													maxHeight: "900px",
													overflowY: "auto",
													paddingBottom: "50px",
												}}
											>
												{renderLines.map((ln, idx) => {
													const text = ln;
													const isIncluded = (text || "").trim()
														? includeMap[(text || "").trim()] !== false
														: false;
													return (
														<div
															key={`line-div-${idx}`}
															data-line-index={idx}
															className="relative flex items-center justify-between gap-2 mb-1 py-1 w-full flex-nowrap"
														>
															<input
																ref={(el) => {
																	listInputRefs.current[idx] = el;
																}}
																onFocus={() => handleListFocus(idx)}
																onKeyDown={(e) => handleKeyDownInsert(e, idx)}
																type="text"
																value={text || ""}
																onChange={(e) => editLine(idx, e.target.value)}
																aria-label={`Edit name for line ${idx + 1}`}
																style={{
																	width: `calc(100% - ${
																		ICON_DIV_WIDTH + 10
																	}px)`,
																}}
																className={`mr-3 truncate text-[18px] md:text-[19px] font-bold focus:outline-none ${
																	!isIncluded
																		? "line-through decoration-red-400 text-gray-400"
																		: ""
																}`}
																maxLength={50}
															/>
															{/* empty-line affordance handled by input placeholder; no plus icon */}

															<div
																className={`${
																	(text || "").trim() ? "flex" : "hidden"
																} items-center gap-3 absolute right-3 md:right-1`}
																style={{ width: ICON_DIV_WIDTH }}
															>
																<input
																	type="checkbox"
																	aria-label={`Include ${(
																		text || ""
																	).trim()} on wheel`}
																	onPointerDown={(e) => e.stopPropagation()}
																	checked={isIncluded}
																	onChange={(e) =>
																		handleToggleInclude(idx, e.target.checked)
																	}
																	className="w-5 h-5 bg-white rounded"
																/>
																<button
																	type="button"
																	onPointerDown={(e) => e.stopPropagation()}
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setHideEmpty(false);
																		clearLineDirect(idx);
																		// focus the input after clearing
																		const ref = advancedMode
																			? advancedInputRefs.current[idx]
																			: listInputRefs.current[idx];
																		if (ref) {
																			try {
																				ref.focus();
																				ref.selectionStart =
																					ref.selectionEnd = 0;
																			} catch {}
																		}
																	}}
																	aria-label={`Clear line ${idx + 1}`}
																	className="w-6 h-6 bg-white/90 rounded shadow-md flex items-center justify-center hover:bg-white p-0"
																>
																	<X size={18} color="#404040" />
																</button>
																<button
																	type="button"
																	onPointerDown={(e) => e.stopPropagation()}
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setHideEmpty(false);
																		deleteLine(idx);
																	}}
																	aria-label={`Delete line ${idx + 1}`}
																	className="w-6 h-6 bg-red-100 text-red-600 rounded shadow-md flex items-center justify-center hover:bg-red-200 p-0"
																>
																	<Trash2 size={16} />
																</button>
															</div>
														</div>
													);
												})}

												{/* Reset / Undo buttons */}
												{/* <div className="absolute right-0 bottom-0  flex gap-2 p-1.5">
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
												</div> */}
											</div>
											<div className="absolute right-0 bottom-0  flex gap-2 px-4.5 py-2">
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
									) : (
										/* Advanced mode: render same-size interactive div */
										<div
											role="region"
											aria-label="Advanced names editor"
											className="w-full whitespace-pre rounded-[7px] bg-gray-50 text-gray-800 overflow-auto text-[18px] md:text-[19px] font-bold border-4 shadow-inner border-gray-300 px-2 pt-3 pb-8 leading-7"
											onPointerDown={(e) => {
												if (isEventInsideLine(e)) return;
												// No rendered lines: reveal the area and force
												// the first row visible so controls render.
												if (renderLines.length === 0) {
													setHideEmpty(false);
													setForcedEmpty((prev) => ({ ...prev, 0: true }));
													e.stopPropagation();
													return;
												}

												// If the last rendered line is empty, do not
												// create another empty row — focus the existing
												// last input instead to avoid flicker.
												const lastIdx = renderLines.length - 1;
												const lastText = renderLines[lastIdx] ?? "";
												if ((lastText || "").trim() === "") {
													setHideEmpty(false);
													// focus the existing last input if available
													setTimeout(() => {
														const ref = advancedInputRefs.current[lastIdx];
														if (ref) {
															try {
																ref.focus();
																const len = ref.value.length;
																ref.selectionStart = ref.selectionEnd = len;
															} catch {}
														}
													}, 0);
													e.stopPropagation();
													return;
												}

												// Otherwise insert a new empty row after the last one
												insertLineAfter(lastIdx);
												e.stopPropagation();
											}}
											style={{
												width: textareaSize.width
													? textareaSize.width + "px"
													: undefined,
												height: textareaSize.height
													? textareaSize.height + "px"
													: undefined,
												minHeight: "600px",
												maxHeight: "900px",
												overflowY: "auto",
												paddingBottom: "100px",
											}}
										>
											{renderLines.map((ln, idx) => {
												const text = ln;
												const isIncluded = (text || "").trim()
													? includeMap[(text || "").trim()] !== false
													: false;
												// Palette button color: prefer id-keyed per-partition override
												const pid = lineIdsRef.current?.[idx];
												const paletteBtnColor = pid
													? partitionColorsById[pid] ??
													  partitionColors[idx] ??
													  colors[idx % colors.length]
													: partitionColors[idx] ?? colors[idx % colors.length];
												const paletteBtnTextColor =
													computeContrastFromColor(paletteBtnColor);
												const weight = getWeightForIndex(idx);
												const percent = Math.round(
													(weight / totalWeightForRender) * 100
												);
												return (
													<div
														key={`adv-line-${idx}`}
														data-line-index={idx}
														className="flex flex-col gap-2 mb-1 py-2 w-full rounded-sm border"
														style={{
															backgroundColor:
																idx % 2 === 0
																	? "rgba(0,0,0,0.05)"
																	: "transparent",
															borderColor:
																dragOverIndex === idx ? "#0671ff" : "#e5e7eb",
															borderWidth: dragOverIndex === idx ? 2 : 1,
														}}
														onDragOver={(e) => {
															e.preventDefault();
															setDragOverIndex(idx);
															try {
																if (e.dataTransfer)
																	e.dataTransfer.dropEffect = "move";
															} catch {}
														}}
														onDragLeave={() => setDragOverIndex(null)}
														onDrop={(e) => {
															e.preventDefault();
															const from = dragIndexRef.current;
															if (from == null) {
																setDragOverIndex(null);
																return;
															}
															const to = idx;
															if (from !== to) {
																const linesArr = names.split("\n");
																const item = linesArr.splice(from, 1)[0] ?? "";
																linesArr.splice(to, 0, item);
																const next = linesArr.join("\n");
																pushHistory(next);
																setNames(next);
																setTimeout(() => {
																	setControlsTick((t) => t + 1);
																}, 0);
															}
															dragIndexRef.current = null;
															setDragOverIndex(null);
														}}
													>
														{/* First inner div: input + checkbox + clear */}
														<div className="flex items-center justify-between w-full relative pl-2">
															<input
																type="text"
																ref={(el) => {
																	advancedInputRefs.current[idx] = el;
																}}
																onFocus={() => handleAdvancedFocus(idx)}
																onKeyDown={(e) => handleKeyDownInsert(e, idx)}
																value={text || ""}
																onChange={(e) => editLine(idx, e.target.value)}
																aria-label={`Edit name for line ${idx + 1}`}
																style={{
																	width: `calc(100% - ${
																		ICON_DIV_WIDTH + 10
																	}px)`,
																}}
																className={`mr-3 bg-transparent truncate text-[18px] md:text-[19px] font-bold focus:outline-none ${
																	!isIncluded
																		? "line-through decoration-red-400 text-gray-400"
																		: ""
																}`}
																maxLength={50}
															/>
															<div
																className={`${
																	(text || "").trim() || forcedEmpty[idx]
																		? "absolute flex"
																		: "hidden"
																} items-center gap-3 right-3 md:right-2`}
																style={{ width: ICON_DIV_WIDTH }}
															>
																<input
																	type="checkbox"
																	aria-label={`Include ${(
																		text || ""
																	).trim()} on wheel`}
																	onPointerDown={(e) => e.stopPropagation()}
																	checked={isIncluded}
																	onChange={(e) =>
																		handleToggleInclude(idx, e.target.checked)
																	}
																	className="w-5 h-5 bg-white rounded"
																/>
																<button
																	type="button"
																	onPointerDown={(e) => e.stopPropagation()}
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setHideEmpty(false);
																		clearLineDirect(idx);
																		const ref = advancedMode
																			? advancedInputRefs.current[idx]
																			: listInputRefs.current[idx];
																		if (ref) {
																			try {
																				ref.focus();
																				ref.selectionStart =
																					ref.selectionEnd = 0;
																			} catch {}
																		}
																	}}
																	aria-label={`Clear line ${idx + 1}`}
																	className="w-6 h-6 bg-white/90 rounded shadow-md flex items-center justify-center hover:bg-white p-0"
																>
																	<X size={18} color="#404040" />
																</button>
																<button
																	type="button"
																	onPointerDown={(e) => e.stopPropagation()}
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setHideEmpty(false);
																		deleteLine(idx);
																	}}
																	aria-label={`Delete line ${idx + 1}`}
																	className="w-6 h-6 bg-red-100 text-red-600 rounded shadow-md flex items-center justify-center hover:bg-red-200 p-0"
																>
																	<Trash2 size={16} />
																</button>
															</div>
														</div>
														{/* Second inner div: palette button */}
														<div className="flex gap-3 flex-wrap justify-between">
															<div className="flex items-center gap-2">
																{/* Drag handle (grip) - acts as the draggable handle for reordering rows */}
																<button
																	type="button"
																	draggable
																	onDragStart={(e) => {
																		e.stopPropagation();
																		dragIndexRef.current = idx;
																		try {
																			if (e.dataTransfer) {
																				e.dataTransfer.setData(
																					"text/plain",
																					String(idx)
																				);
																				e.dataTransfer.effectAllowed = "move";
																			}
																		} catch {}
																	}}
																	onDragEnd={() => {
																		dragIndexRef.current = null;
																		setDragOverIndex(null);
																	}}
																	onPointerDown={(e) => e.stopPropagation()}
																	aria-label={`Drag ${(
																		(text || "") as string
																	).trim()}`}
																	className="flex items-center gap-2 px-3 py-1 rounded shadow bg-blue-200"
																>
																	<Grip size={16} />
																</button>
																<button
																	type="button"
																	className="flex items-center gap-2 px-3 py-1 rounded shadow"
																	style={{
																		background: paletteBtnColor,
																		color: paletteBtnTextColor,
																	}}
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		openPaletteFor(
																			idx,
																			e.currentTarget as HTMLElement
																		);
																	}}
																	aria-label={`Open palette for ${(
																		text || ""
																	).trim()}`}
																>
																	<Palette
																		size={16}
																		color={paletteBtnTextColor}
																	/>
																	{/* <span className="text-xs">Color</span> */}
																</button>

																<div className="flex ">
																	<button
																		type="button"
																		className="relative overflow-hidden flex items-center gap-2 px-3 py-1 rounded shadow bg-blue-200"
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			pendingPartitionIndexForFileRef.current =
																				idx;
																			entryFileInputRef.current?.click();
																		}}
																		aria-label={`Select image for ${(
																			text || ""
																		).trim()}`}
																	>
																		{(() => {
																			const id = lineIdsRef.current?.[idx];
																			const src = id
																				? partitionImagesById[id] ??
																				  partitionImages[idx]
																				: partitionImages[idx];
																			if (src) {
																				return (
																					<>
																						<Image
																							src={src}
																							alt="thumb"
																							fill
																							className="object-cover rounded"
																						/>
																						{/* invisible placeholder to keep button inline dimensions equal to icon case */}
																						<span
																							className="w-4 h-4 inline-block"
																							aria-hidden="true"
																						/>
																					</>
																				);
																			}
																			return <ImageIcon size={16} />;
																		})()}
																	</button>
																	{/* Delete button for advanced-mode: appears when a partition image exists */}
																	{(() => {
																		const id2 = lineIdsRef.current?.[idx];
																		const src2 = id2
																			? partitionImagesById[id2] ??
																			  partitionImages[idx]
																			: partitionImages[idx];
																		if (!src2) return null;
																		return (
																			<button
																				type="button"
																				className="p-1 rounded-full scale-80 bg-gray-50 border border-gray-200 text-red-600 shadow z-10"
																				onClick={(ev) => {
																					ev.stopPropagation();
																					ev.preventDefault();
																					const idLocal =
																						lineIdsRef.current?.[idx];
																					if (idLocal) {
																						partitionImageBlobUrlsByIdRef.current[
																							idLocal
																						] = null;
																						partitionImageBitmapByIdRef.current[
																							idLocal
																						] = null;
																						setPartitionImagesById((prev) => {
																							const copy = { ...prev };
																							delete copy[idLocal];
																							return copy;
																						});
																					}
																					partitionImageBlobUrlsRef.current[
																						idx
																					] = null;
																					partitionImageBitmapRefs.current[
																						idx
																					] = null;
																					setPartitionImages((prev) => {
																						const copy = { ...prev };
																						delete copy[idx];
																						return copy;
																					});
																					drawWheelRef.current?.();
																				}}
																				aria-label={`Remove image for ${(
																					text || ""
																				).trim()}`}
																			>
																				<X size={14} />
																			</button>
																		);
																	})()}
																</div>
															</div>

															{/* Share button: same style as Image button, placed to the right */}
															<button
																type="button"
																className="flex items-center gap-2 px-3 py-1 rounded shadow bg-blue-200"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	// Open weight slider popover anchored to this button
																	sliderAnchorRef.current =
																		e.currentTarget as HTMLElement;
																	setSliderOpenFor(idx);
																}}
																aria-label={`Share ${(text || "").trim()}`}
															>
																<span className="text-sm font-semibold">
																	{percent} %
																</span>
																{/* <Percent size={16} /> */}
																<span className="text-xs">Win</span>
															</button>
														</div>
													</div>
												);
											})}
											{/* Tap to Add label below the list — show when there are no rows or when last line is non-empty */}
											{(renderLines.length === 0 ||
												(renderLines.length > 0 &&
													(renderLines[renderLines.length - 1] || "").trim() !==
														"")) && (
												<div className="mt-4">
													<div className="text-gray-400 text-[26px] flex justify-center tracking-tight p-5 items-center opacity-50 select-none">
														Tap to Add
													</div>
												</div>
											)}
											{/* Reset / Undo inside advanced container */}
											<div className="absolute right-0 bottom-0 flex gap-2 px-4.5 py-2">
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
									)}
								</div>
							</div>
							<p
								className="text-sm text-gray-500 mt-2"
								style={getTextContrastStyles() || undefined}
							>
								{/* {namesList.length} {namesList.length === 1 ? "name" : "names"}{" "}
								entered */}
								Number of{" "}
								{namesList.length === 1 ? "Participant" : "Participants"}
								{" : "}
								{namesList.length}{" "}
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
									<X
										size={20}
										className="text-yellow-900 hover:text-yellow-400"
									/>
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
					<h2
						className={`text-2xl tracking-wide  font-medium text-slate-600 mb-4 ${adalima.className}`}
					>
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

					<h3
						className={`text-xl tracking-wide  font-medium text-slate-600 mb-4 ${adalima.className}`}
					>
						Why use SpinWheelQuiz ?
					</h3>
					<p className="text-slate-700 leading-relaxed mb-6">
						SpinWheelQuiz is an online spin wheel generator optimized for fast
						setup, mobile devices and live events. Customize backgrounds, sounds
						and timers, manage entries quickly and run fair, transparent spins
						with a polished presentation that keeps audiences engaged.
					</p>

					<h3
						className={`text-xl tracking-wide  font-medium text-slate-600 mb-4 ${adalima.className}`}
					>
						Quick Guide — How to Play
					</h3>
					<ol className="list-decimal list-inside ml-4 space-y-2 text-slate-700">
						<li>
							Enter entries (one per line) in the names area. Use the
							check/clear controls to manage individual lines. Toggle Advanced
							mode for per-entry controls (color, image, weight, reorder).
						</li>
						<li>
							Adjust weights to change winning odds: open the weight popover to
							set values (0–200) and see the calculated percentage for each
							entry.
						</li>
						<li>
							Customize the stage: choose a full-screen background or a wheel
							image, and pick or upload spin/winner sounds to match your event.
						</li>
						<li>
							Reorder entries by dragging the grip handle (Advanced mode) to
							change the visual order while preserving images, colors and
							weights.
						</li>
						<li>
							Click or tap the wheel to spin. The wheel accelerates, cruises and
							slows naturally until a winner is revealed. Use the dialog to copy
							or export results.
						</li>
					</ol>
				</section>
			</div>
		</div>
	);
}
