const express = require("express");
const app = express();
const voicevoxApi = require("./voicevoxAPI");

const port = 8000;

app.use(express.json());

app.post("/synthesize", async (req, res) => {
  try {
    const voiceText = req.body.text;
    const speakerID = req.body.speaker ?? 13;
    const savePath = req.body.savePath ?? "./audio.wav";
    await voicevoxApi(voiceText, speakerID, savePath)
    res.status(200).send("success");
  } catch (error) {
    res.status(500).send("error");
  }
})

app.listen(port, () => {
  console.log(`Voicebox API: http://localhost:${port}`);
})
