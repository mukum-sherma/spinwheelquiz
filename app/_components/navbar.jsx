"use client";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
	Menubar,
	MenubarMenu,
	MenubarTrigger,
	MenubarContent,
	MenubarLabel,
	MenubarSeparator,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarItem,
	MenubarSub,
	MenubarSubTrigger,
	MenubarSubContent,
} from "@/components/ui/menubar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Image as ImageIcon,
	Music,
	Palette,
	RotateCcw,
	Timer,
	Trophy,
	Volume2,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import localFont from "next/font/local";

const masque = localFont({
	src: "../_fonts/masque.ttf",
	variable: "--font-masque",
});

const adalima = localFont({
	src: "../_fonts/adalima.ttf",
	variable: "--font-adalima",
});

// Timer options from 2s to 40s
const timerOptions = Array.from({ length: 39 }, (_, index) => index + 2);

const spinAudioFiles = [
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

const winningAudioFiles = [
	"cheering-crowd-whistle",
	"fanfare-announcement",
	"huge-crowd-cheering",
	"moderate-applause",
	"small-group-applause",
	"video-game-win",
	"win-alarm",
	"yes-victory",
];

const Navbar = ({
	onTimerChange,
	onBackgroundChange,
	onWinningSoundChange,
	onSpinSoundChange,
	currentTimer = 10,
	currentWinningSound = "small-group-applause",
	currentSpinSound = "single-spin",
	audioContextRef,
	winningBuffersRef,
	spinBuffersRef,
}) => {
	const [timerValue, setTimerValue] = useState(String(currentTimer));
	const [winningSoundValue, setWinningSoundValue] =
		useState(currentWinningSound);
	const [spinSoundValue, setSpinSoundValue] = useState(currentSpinSound);
	const [imageFiles, setImageFiles] = useState([]);
	const [loadingImages, setLoadingImages] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const previewSourceRef = useRef(null);

	useEffect(() => {
		setTimerValue(String(currentTimer));
	}, [currentTimer]);

	useEffect(() => {
		setWinningSoundValue(currentWinningSound);
	}, [currentWinningSound]);

	useEffect(() => {
		setSpinSoundValue(currentSpinSound);
	}, [currentSpinSound]);

	useEffect(() => {
		// Fetch fullpage images dynamically from API
		setLoadingImages(true);
		fetch("/api/images/fullpage")
			.then((res) => res.json())
			.then((data) => {
				setImageFiles(data.images || []);
				setLoadingImages(false);
			})
			.catch((err) => {
				console.error("Error fetching images:", err);
				setLoadingImages(false);
			});
	}, [audioContextRef, winningBuffersRef]);

	const handleTimerChange = useCallback(
		(value) => {
			setTimerValue(value);
			onTimerChange?.(Number(value));
		},
		[onTimerChange]
	);

	const handleColorChange = useCallback(
		(event) => {
			const value = event.target.value;
			onBackgroundChange?.({ type: "color", value });
		},
		[onBackgroundChange]
	);

	const previewSound = useCallback(
		(soundName) => {
			// Stop any currently playing preview
			if (previewSourceRef.current) {
				try {
					previewSourceRef.current.stop();
					previewSourceRef.current.disconnect();
				} catch (e) {
					// Already stopped or disconnected
					console.log("Preview stop/disconnect failed:", e);
				}
				previewSourceRef.current = null;
			}

			// Play new sound preview
			if (audioContextRef?.current && winningBuffersRef?.current) {
				const audioContext = audioContextRef.current;
				const buffer = winningBuffersRef.current.get(soundName);

				if (buffer) {
					// Resume context if suspended
					if (audioContext.state === "suspended") {
						audioContext.resume();
					}

					const source = audioContext.createBufferSource();
					source.buffer = buffer;
					const gain = audioContext.createGain();
					gain.gain.value = 0.7;
					source.connect(gain);
					gain.connect(audioContext.destination);
					source.start(0);
					previewSourceRef.current = source;

					// Auto-clear ref when sound ends
					source.onended = () => {
						if (previewSourceRef.current === source) {
							previewSourceRef.current = null;
						}
					};
				}
			}
		},
		[audioContextRef, winningBuffersRef]
	);

	const handleWinningSoundChange = useCallback(
		(soundName) => {
			setWinningSoundValue(soundName);
			onWinningSoundChange?.(soundName);
			previewSound(soundName);
		},
		[onWinningSoundChange, previewSound]
	);

	const handleResetWinningSound = useCallback(() => {
		const defaultSound = "small-group-applause";
		setWinningSoundValue(defaultSound);
		onWinningSoundChange?.(defaultSound);
		previewSound(defaultSound);
	}, [onWinningSoundChange, previewSound]);

	const previewSpinSound = useCallback(
		(soundName) => {
			// Stop any currently playing preview
			if (previewSourceRef.current) {
				try {
					previewSourceRef.current.stop();
					previewSourceRef.current.disconnect();
				} catch (e) {
					// Already stopped or disconnected
					console.log("Preview stop/disconnect failed:", e);
				}
				previewSourceRef.current = null;
			}

			// Play new spin sound preview
			if (audioContextRef?.current && spinBuffersRef?.current) {
				const audioContext = audioContextRef.current;
				const buffer = spinBuffersRef.current.get(soundName);

				if (buffer) {
					// Resume context if suspended
					if (audioContext.state === "suspended") {
						audioContext.resume();
					}

					const source = audioContext.createBufferSource();
					source.buffer = buffer;
					const gain = audioContext.createGain();
					gain.gain.value = 0.7;
					source.connect(gain);
					gain.connect(audioContext.destination);
					source.start(0);
					previewSourceRef.current = source;

					// Auto-clear ref when sound ends
					source.onended = () => {
						if (previewSourceRef.current === source) {
							previewSourceRef.current = null;
						}
					};
				}
			}
		},
		[audioContextRef, spinBuffersRef]
	);

	const handleSpinSoundChange = useCallback(
		(soundName) => {
			setSpinSoundValue(soundName);
			onSpinSoundChange?.(soundName);
			previewSpinSound(soundName);
		},
		[onSpinSoundChange, previewSpinSound]
	);

	const handleResetSpinSound = useCallback(() => {
		const defaultSound = "single-spin";
		setSpinSoundValue(defaultSound);
		onSpinSoundChange?.(defaultSound);
		previewSpinSound(defaultSound);
	}, [onSpinSoundChange, previewSpinSound]);

	const handleResetBackground = useCallback(() => {
		onBackgroundChange?.({ type: "reset" });
	}, [onBackgroundChange]);

	const handleImageClick = useCallback(
		(imagePath) => {
			onBackgroundChange?.({ type: "image", value: imagePath });
		},
		[onBackgroundChange]
	);

	// ref for programmatically opening the native color picker
	const colorInputRef = useRef(null);
	// timer/ref used to poll for the color input mounting so we can open picker
	const colorPickerPollRef = useRef(null);

	useEffect(() => {
		return () => {
			if (colorPickerPollRef.current) {
				clearInterval(colorPickerPollRef.current);
				colorPickerPollRef.current = null;
			}
		};
	}, []);

	const menubarItems = useMemo(
		() => (
			<Menubar
				className={`${masque.className} tracking-wide text-[#404040] bg-transparent border-0 shadow-none md:flex-row flex-col items-stretch h-auto space-y-2 md:space-y-0`}
			>
				<MenubarMenu>
					<MenubarTrigger className="cursor-pointer hover:text-orange-700 text-[13px] transition-colors w-full md:w-auto justify-start">
						<Timer className="mr-2 h-4 w-4" /> Timers
					</MenubarTrigger>
					<MenubarContent className="max-h-[320px] max-md:hidden min-w-[210px] overflow-y-auto">
						<MenubarLabel>Spin duration</MenubarLabel>
						<MenubarSeparator />
						<MenubarRadioGroup
							value={timerValue}
							onValueChange={handleTimerChange}
						>
							{timerOptions.map((seconds) => (
								<MenubarRadioItem key={seconds} value={String(seconds)}>
									{seconds} {seconds === 1 ? "Second" : "Seconds"}
								</MenubarRadioItem>
							))}
						</MenubarRadioGroup>
						{/* <RadioGroup
							value={String(timerValue)}
							onValueChange={(val) => handleTimerChange(Number(val))}
							className="p-1"
						>
							{timerOptions.map((seconds) => (
								<div key={seconds} className="flex items-center gap-2">
									<RadioGroupItem
										value={String(seconds)}
										id={`timer-${seconds}`}
									/>
									<Label htmlFor={`timer-${seconds}`}>
										{seconds} {seconds === 1 ? "Second" : "Seconds"}
									</Label>
								</div>
							))}
						</RadioGroup> */}
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger className=" cursor-pointer text-[13px] hover:text-orange-700 transition-colors w-full md:w-auto justify-start">
						<Volume2 className="mr-2 h-4 w-4" /> Sounds
					</MenubarTrigger>
					<MenubarContent className="min-w-[250px] max-md:hidden">
						<MenubarLabel>
							<div className="flex items-center gap-2 font-medium">
								<Music className="h-4 w-4" />
								Wheel Spin Sounds
							</div>
						</MenubarLabel>
						<MenubarSeparator />
						<RadioGroup
							value={spinSoundValue}
							onValueChange={handleSpinSoundChange}
							className="p-1"
							id="spinSounds"
						>
							{spinAudioFiles.map((soundFile) => (
								<div
									key={soundFile}
									className="flex items-center gap-2 font-light"
								>
									<RadioGroupItem
										value={String(soundFile)}
										id={`spin-${soundFile}`}
									/>
									<Label htmlFor={`spin-${soundFile}`} className="font-normal">
										{soundFile
											.replace(/-/g, " ")
											.replace(/\b\w/g, (c) => c.toUpperCase())}
									</Label>
								</div>
							))}
						</RadioGroup>

						<MenubarSeparator />

						<MenubarItem onClick={handleResetSpinSound}>
							<RotateCcw className="mr-2 h-4 w-4" />
							Reset Spin Sound
						</MenubarItem>

						<MenubarSeparator />

						<MenubarLabel>
							<div className="flex items-center gap-2 font-medium">
								<Trophy className="h-4 w-4" />
								Winning Sounds
							</div>
						</MenubarLabel>
						<MenubarSeparator />
						{/* <MenubarRadioGroup
							value={winningSoundValue}
							onValueChange={handleWinningSoundChange}
						>
							{winningAudioFiles.map((soundFile) => (
								<MenubarRadioItem key={soundFile} value={soundFile}>
									{soundFile
										.replace(/-/g, " ")
										.replace(/\b\w/g, (c) => c.toUpperCase())}
								</MenubarRadioItem>
							))}
						</MenubarRadioGroup> */}
						<RadioGroup
							value={winningSoundValue}
							onValueChange={handleWinningSoundChange}
							className="p-1"
							id="winningSounds"
						>
							{winningAudioFiles.map((soundFile) => (
								<div key={soundFile} className="flex items-center gap-2">
									<RadioGroupItem
										value={String(soundFile)}
										id={`timer-${soundFile}`}
									/>
									<Label htmlFor={`timer-${soundFile}`} className="font-normal">
										{soundFile
											.replace(/-/g, " ")
											.replace(/\b\w/g, (c) => c.toUpperCase())}
									</Label>
								</div>
							))}
						</RadioGroup>

						<MenubarSeparator />

						<MenubarItem onClick={handleResetWinningSound}>
							<RotateCcw className="mr-2 h-4 w-4" />
							Reset Winning Sound
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>

				<MenubarMenu>
					<MenubarTrigger className=" cursor-pointer text-[13px] hover:text-orange-700 transition-colors w-full md:w-auto justify-start">
						<Palette className="mr-2 h-4 w-4" /> Backgrounds
					</MenubarTrigger>
					<MenubarContent className="min-w-[230px] max-md:hidden">
						<MenubarLabel>Customize the stage</MenubarLabel>
						<MenubarSeparator />
						<MenubarSub>
							<MenubarSubTrigger
								onPointerEnter={() => {
									// Start polling for the color input to mount, then open picker.
									if (colorPickerPollRef.current) return;
									colorPickerPollRef.current = setInterval(() => {
										const el = colorInputRef.current;
										if (!el) return;
										try {
											if (typeof el.showPicker === "function") {
												el.showPicker();
											} else {
												el.click();
											}
										} catch {
											// ignore
										}
										clearInterval(colorPickerPollRef.current);
										colorPickerPollRef.current = null;
									}, 60);
								}}
								onPointerLeave={() => {
									if (colorPickerPollRef.current) {
										clearInterval(colorPickerPollRef.current);
										colorPickerPollRef.current = null;
									}
								}}
								onClick={() => {
									// Try immediately on click as a fallback
									const el = colorInputRef.current;
									if (!el) return;
									try {
										if (typeof el.showPicker === "function") el.showPicker();
										else el.click();
									} catch {
										// ignore
									}
								}}
							>
								<Palette className="h-4 w-4 mr-2" /> Colors
							</MenubarSubTrigger>
							<MenubarSubContent>
								<div className="p-2 text-sm">
									<p className="text-muted-foreground text-xs uppercase tracking-wide">
										PICK A COLOR
									</p>
									<input
										ref={colorInputRef}
										type="color"
										className="h-0 w-full cursor-pointer rounded border border-muted"
										onChange={handleColorChange}
										aria-label="Select background color"
									/>
								</div>
							</MenubarSubContent>
						</MenubarSub>
						<MenubarSub>
							<MenubarSubTrigger>
								<ImageIcon className="h-4 w-4 mr-2" /> Images
							</MenubarSubTrigger>
							<MenubarSubContent className="w-[80%] md:w-[700px] max-h-[400px] overflow-y-auto">
								<div className="p-3">
									<p className="text-muted-foreground text-xs uppercase tracking-wide mb-3">
										Choose background
									</p>
									{loadingImages ? (
										<div className="flex items-center justify-center py-8">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
										</div>
									) : imageFiles.length === 0 ? (
										<p className="text-sm text-muted-foreground py-4 text-center">
											No images found in /public/images/fullpage
										</p>
									) : (
										<div className="flex flex-wrap gap-2">
											{imageFiles.map((img) => (
												<div
													key={img}
													className="w-[200px] h-[200px] cursor-pointer rounded overflow-hidden border-2 border-muted hover:border-primary transition-colors relative bg-muted"
													onClick={() =>
														handleImageClick(`/images/fullpage/${img}`)
													}
												>
													<Image
														src={`/images/fullpage/${img}`}
														alt={`Background ${img}`}
														fill
														sizes="200px"
														className="object-cover"
														loading="lazy"
														quality={75}
													/>
												</div>
											))}
										</div>
									)}
								</div>
							</MenubarSubContent>
						</MenubarSub>
						<MenubarSeparator />
						<MenubarItem onClick={handleResetBackground}>
							<RotateCcw className="h-4 w-4 mr-2" /> Reset Background
						</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		),
		[
			timerValue,
			spinSoundValue,
			winningSoundValue,
			imageFiles,
			loadingImages,
			handleTimerChange,
			handleWinningSoundChange,
			handleSpinSoundChange,
			handleResetSpinSound,
			handleResetWinningSound,
			handleColorChange,
			handleImageClick,
			handleResetBackground,
		]
	);

	return (
		<div className="bg-orange-200/90 shadow-lg">
			<div className="container mx-auto flex h-[64px] items-center justify-between px-4">
				<section
					id="banner"
					className="font-bold text-lg tracking-wide text-orange-950"
				>
					<Link
						href="/"
						className="flex items-center gap-3 hover:opacity-80 transition-opacity"
					>
						<Image
							src="/banner.png"
							alt="SpinWheelQuiz Logo"
							width={50}
							height={50}
							className="object-contain"
						/>
						<span
							className={`uppercase font-medium ${adalima.className} mt-1 text-[20px] tracking-widest text-shadow-[0_0px_1px_rgba(255,255,255,0.4)]`}
						>
							<h1>SpinWheelQuiz</h1>
						</span>
					</Link>
				</section>
				<section id="menu" className="hidden md:block">
					{menubarItems}
				</section>
				<section id="menu-mobile" className="md:hidden">
					<DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="focus-visible:ring-0 focus-visible:ring-offset-0 outline-none border relative inline-flex items-center justify-center rounded-md p-2 text-orange-900 transition-colors"
								aria-label="Toggle menu"
							>
								<div className="w-6 h-5 flex flex-col justify-center items-center gap-[3px]">
									<span
										className={`block h-[3px] w-6 shadow-md bg-orange-800 transition-all duration-300 ease-in-out ${
											mobileMenuOpen
												? "rotate-45 translate-y-[3px]"
												: "translate-y-[-3px]"
										}`}
									/>
									<span
										className={`block h-[3px] w-6 shadow-md bg-orange-800 transition-all duration-300 ease-in-out ${
											mobileMenuOpen
												? "-rotate-45 translate-y-[-3px]"
												: "translate-y-[3px]"
										}`}
									/>
								</div>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-[280px] max-h-[calc(100vh-80px)] overflow-y-auto md:hidden"
						>
							<Accordion type="single" collapsible className="w-full">
								{/* Timers */}
								<AccordionItem value="timers" className="border-0">
									<AccordionTrigger className="px-3 py-2 text-sm font-bold text-orange-900 hover:bg-orange-100 rounded-md hover:no-underline">
										<div className="flex items-center gap-2 text-[15px]">
											<Timer className="h-4 w-4 " />
											Timers
										</div>
									</AccordionTrigger>
									<AccordionContent className="px-2 pb-2">
										<div className="px-2 py-1.5 text-sm font-semibold">
											Spin duration
										</div>
										<div className="h-px bg-border my-1" />
										<div className="p-1 max-h-[320px] overflow-y-auto">
											{timerOptions.map((seconds) => (
												<button
													key={seconds}
													onClick={() => handleTimerChange(String(seconds))}
													className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent ${
														timerValue === String(seconds) ? "bg-accent" : ""
													}`}
												>
													<div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
														{timerValue === String(seconds) && (
															<div className="w-2 h-2 rounded-full bg-primary" />
														)}
													</div>
													{seconds} {seconds === 1 ? "Second" : "Seconds"}
												</button>
											))}
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* Sounds */}
								<AccordionItem value="sounds" className="border-0">
									<AccordionTrigger className="px-3 py-2 text-sm font-bold text-orange-900 hover:bg-orange-100 rounded-md hover:no-underline">
										<div className="flex items-center gap-2 text-[15px]">
											<Volume2 className="h-4 w-4" />
											Sounds
										</div>
									</AccordionTrigger>
									<AccordionContent className="px-2 pb-2">
										{/* Wheel Spin Sounds */}
										<div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
											<Music className="h-4 w-4" />
											Wheel Spin Sounds
										</div>
										<div className="p-1 space-y-1 max-h-[200px] overflow-y-auto">
											{spinAudioFiles.map((soundFile) => (
												<button
													key={soundFile}
													onClick={() => handleSpinSoundChange(soundFile)}
													className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-orange-100 rounded-md transition-colors text-left"
												>
													<div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
														{spinSoundValue === soundFile && (
															<div className="w-2 h-2 rounded-full bg-primary" />
														)}
													</div>
													{soundFile
														.replace(/-/g, " ")
														.replace(/\b\w/g, (c) => c.toUpperCase())}
												</button>
											))}
										</div>

										<div className="h-px bg-border my-2" />

										{/* Reset Spin Sound */}
										<div className="p-1">
											<button
												onClick={handleResetSpinSound}
												className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-orange-100 rounded-md transition-colors text-left"
											>
												<RotateCcw className="h-4 w-4" />
												Reset Spin Sound
											</button>
										</div>

										<div className="h-px bg-border my-2" />

										{/* Winning Sounds */}
										<div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
											<Trophy className="h-4 w-4" />
											Winning Sounds
										</div>
										<div className="p-1 space-y-1 max-h-[200px] overflow-y-auto">
											{winningAudioFiles.map((soundFile) => (
												<button
													key={soundFile}
													onClick={() => handleWinningSoundChange(soundFile)}
													className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-orange-100 rounded-md transition-colors text-left"
												>
													<div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
														{winningSoundValue === soundFile && (
															<div className="w-2 h-2 rounded-full bg-primary" />
														)}
													</div>
													{soundFile
														.replace(/-/g, " ")
														.replace(/\b\w/g, (c) => c.toUpperCase())}
												</button>
											))}
										</div>

										<div className="h-px bg-border my-2" />

										{/* Reset Sound */}
										<div className="p-1">
											<button
												onClick={handleResetWinningSound}
												className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-orange-100 rounded-md transition-colors text-left"
											>
												<RotateCcw className="h-4 w-4" />
												Reset Sound
											</button>
										</div>
									</AccordionContent>
								</AccordionItem>

								{/* Backgrounds */}
								<AccordionItem value="backgrounds" className="border-0">
									<AccordionTrigger className="px-3 py-2 text-sm font-bold text-orange-900 hover:bg-orange-100 rounded-md hover:no-underline">
										<div className="flex items-center gap-2 text-[15px]">
											<Palette className="h-4 w-4 " />
											Backgrounds
										</div>
									</AccordionTrigger>
									<AccordionContent className="px-2 pb-2">
										<div className="px-2 py-1.5 text-sm font-semibold">
											Customize the stage
										</div>
										<div className="h-px bg-border my-1" />
										<div className="p-1 space-y-1">
											<Accordion
												type="single"
												collapsible
												className="w-full md:hidden"
											>
												<AccordionItem value="colors" className="border-0">
													<AccordionTrigger className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:no-underline">
														<div className="flex items-center gap-2">
															<Palette className="h-4 w-4" /> Colors
														</div>
													</AccordionTrigger>
													<AccordionContent className="px-2 pb-2">
														<div className="space-y-2 p-2 text-sm">
															<p className="text-muted-foreground text-xs uppercase tracking-wide">
																PICK A COLOR
															</p>
															<input
																type="color"
																className="h-10 w-full cursor-pointer rounded border border-muted"
																onChange={handleColorChange}
																aria-label="Select background color"
															/>
														</div>
													</AccordionContent>
												</AccordionItem>
												<AccordionItem value="images" className="border-0">
													<AccordionTrigger className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:no-underline">
														<div className="flex items-center gap-2">
															<ImageIcon className="h-4 w-4" /> Images
														</div>
													</AccordionTrigger>
													<AccordionContent className="px-2 pb-2">
														<div className="p-3">
															<p className="text-muted-foreground text-xs uppercase tracking-wide mb-3">
																Choose background
															</p>
															{loadingImages ? (
																<div className="flex items-center justify-center py-8">
																	<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
																</div>
															) : imageFiles.length === 0 ? (
																<p className="text-sm text-muted-foreground py-4 text-center">
																	No images found in /public/images/fullpage
																</p>
															) : (
																<div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
																	{imageFiles.map((img) => (
																		<div
																			key={img}
																			className="w-[100px] h-[100px] cursor-pointer rounded overflow-hidden border-2 border-muted hover:border-primary transition-colors relative bg-muted"
																			onClick={() =>
																				handleImageClick(
																					`/images/fullpage/${img}`
																				)
																			}
																		>
																			<Image
																				src={`/images/fullpage/${img}`}
																				alt={`Background ${img}`}
																				fill
																				sizes="100px"
																				className="object-cover"
																				loading="lazy"
																				quality={75}
																			/>
																		</div>
																	))}
																</div>
															)}
														</div>
													</AccordionContent>
												</AccordionItem>
											</Accordion>
											<div className="h-px bg-border my-1" />
											<button
												onClick={handleResetBackground}
												className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
											>
												<RotateCcw className="h-4 w-4" /> Reset Background
											</button>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</DropdownMenuContent>
					</DropdownMenu>
				</section>
			</div>
		</div>
	);
};

export default Navbar;
