import ffmpeg
from google import genai
from google.genai import types
import wave
import time


def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)

def interview(video):
    input_file = video
    output_file = 'output_audio.mp3'

    # Extract audio from video
    ffmpeg.input(input_file) \
      .output(output_file) \
      .overwrite_output() \
      .run()
    print("✅ MP3 file created!")

    # Load environment variables
    from dotenv import load_dotenv
    import os
    load_dotenv()

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    # Upload the MP3 file
    myfile = client.files.upload(file=output_file)

    # Wait for the file to be active
    print("⌛ Waiting for Gemini to process the audio file...")
    while True:
        status = client.files.get(name=myfile.name)
        if status.state == "ACTIVE":
            print("✅ File is now active!")
            break
        time.sleep(1)

    # Ask Gemini to generate questions based on the audio
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            "Pretend you are interviewing this person-- It could be for a job or business pitch or even something like a TED talk. Ask relevant questions. For a job, ask interview questions; for a business pitch ask questions like Shark Tank. Keep it brief and under 45 seconds.",
            myfile
        ]
    )
    print(response.text)

    # Generate TTS (text-to-speech) response
    tts_response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=f"Say in a corporate voice: {response.text}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name='Charon'
                    )
                )
            )
        )
    )

    audio_data = tts_response.candidates[0].content.parts[0].inline_data.data

    file_name = 'out.wav'
    wave_file(file_name, audio_data)
    print("✅ Audio response saved as out.wav")
    
