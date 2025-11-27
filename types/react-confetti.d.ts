declare module "react-confetti" {
	import * as React from "react";
	type Props = {
		width?: number;
		height?: number;
		recycle?: boolean;
		numberOfPieces?: number;
		gravity?: number;
		// allow other props
		[key: string]: unknown;
	};
	const Confetti: React.ComponentType<Props>;
	export default Confetti;
}
