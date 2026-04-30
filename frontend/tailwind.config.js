/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        blink: {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.05)" },
        },
        mouthOpen: {
          "0%, 100%": { transform: "scaleY(0.2)" },
          "50%": { transform: "scaleY(1)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 3s infinite",
        mouthOpen: "mouthOpen 0.35s ease-in-out infinite",
        pulse2: "pulse2 2s ease-in-out infinite",
        slideIn: "slideIn 0.3s ease-out forwards",
        fadeIn: "fadeIn 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
