let q = "gta 6 game";
let txt =
  "is a game that involves the interaction with a user interface to generate visual feedback on a video device. Video games may have a reward system—such as a score—that is based on accomplishment of tasks set within the game.The in video game traditionally refers to a raster display device. However, with the popular use of the term video game, it now implies any type of display device. The electronic systems used to play video games are known as platforms; examples of these are personal computers and . These platforms are broad in range, from large computers such as mainframes, to handheld devices such as cell phones and PDAs.";

// const textWords = txt.toLowerCase().split(/\W+/); // split on non-word characters

// const matchFound = queryWords.some((word) => textWords.includes(word));

// console.log("Match found?", matchFound);

// const matches = queryWords.filter((word) => textWords.includes(word));
// console.log("Matching words:", matches);

const textWords = txt.toLowerCase().split(/\W+/);

console.log(textWords);
