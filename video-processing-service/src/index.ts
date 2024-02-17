import express from "express";

import { isVideoNew, setVideo } from "./firestore";

import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from "./storage";

setupDirectories();

const app = express();
app.use(express.json());
// const port = 3000;

app.post("/process-video", async (req, res) => {

    let data;

    try {

        const message = Buffer.from(req.body.message.data, "base64").toString("utf-8");
        data = JSON.parse(message);

        if (!data.name) {

            throw new Error('Invalid Message Payload Received.');
        }

    } catch (error) {

        console.error(error);
        return res.status(400).send(`Bad Request: missing filename.`);
    }

    console.log("eafsdfsdafdsfdsa")

    const inputFileName = data.name; // In format of <UID>-<DATE>.<EXTENSION>
    const outputFileName = `processed-${inputFileName}`;
    const videoId = inputFileName.split('.')[0];

    if (!isVideoNew(videoId)) {
        return res.status(400).send('Bad Request: video already processing or processed.');
      } else {
        await setVideo(videoId, {
          id: videoId,
          uid: videoId.split('-')[0],
          status: 'processing'
        });
      }
    
    await downloadRawVideo(inputFileName);

    console.log(`Processing video: ${inputFileName}`);

    try {

        await convertVideo(inputFileName, outputFileName);

    } catch (err) {

        await Promise.all([

            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFileName)

        ]);

        console.error(err);
        return res.status(500).send("Internal Server Error: Video Processing Failed.");
    }

    await uploadProcessedVideo(outputFileName);

    await setVideo(videoId, {
        status: 'processed',
        filename: outputFileName
      });


    await Promise.all([

        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)

    ]);

    return res.status(200).send("Processing Finished Successfully.");

    // // Get path of input video file
    // const inputFilePath = req.body.inputFilePath;
    // const outputFilePath = req.body.outputFilePath;
    
    // if (!inputFilePath || !outputFilePath) {
    //     res.status(400).send("Bad Request: Missing file path.");
        
    // }

});

// app.get('/', (req, res) => {

//     res.send("Hello World!");

// });

const port = process.env.PORT || 3000;

app.listen(port, () => {

    console.log(`Server running at http://localhost:${port}`);
});

