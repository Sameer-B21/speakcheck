from google import genai
import time

prompt ="""You are a JSON-only response generator, provide your response in plain text. Watch the video I provide, then answer only with a single JSON object matching exactly this structure (no markdown, no explanation, no extra keys):

{
  "Posture & Physical Presence": {
    "Analysis": "string",
    "Recommendations": ["string", ...],
    "Relevant Video Section": "string"
  },
  "Eye Contact": {
    "Analysis": "string",
    "Recommendations": ["string", ...],
    "Relevant Video Section": "string"
  },
  "Vocal Delivery": {
    "Analysis": "string",
    "Recommendations": ["string", ...],
    "Relevant Video Section": "string"
  },
  "Content & Structure": {
    "Analysis": "string",
    "Recommendations": ["string", ...],
    "Relevant Video Section": "string"
  },
  "Nervousness/Comfort": {
    "Analysis": "string",
    "Recommendations": ["string", ...],
    "Relevant Video Section": "string"
  },
  "Summary": {
    "Overall Assessment": "string",
    "Actionable Steps": ["string", ...]
  }
}

You are an expert public speaking coach. Analyze the speaker in the video according to the following best practices for each category:

Posture & Physical Presence:
- **Best Practices:** Speaker should maintain an open, confident stance, avoiding closed-off postures like crossed arms or hunched shoulders. Purposeful movement and natural hand gestures enhance engagement. Avoid fidgeting, rocking, or excessive pacing, as these can distract the audience and signal nervousness.
- **Analysis Focus:** Describe the speaker's overall stance, the naturalness and purpose of their gestures, and any distracting movements or signs of stiffness. Be specific about their body language throughout the presentation.

Eye Contact:
- **Best Practices:** Speaker should establish genuine eye contact with various audience members across the room, holding it for approximately 2-3 seconds per person. This creates connection and shows engagement. Avoid staring at one spot, looking over the audience's heads, or constantly scanning without connecting.
- **Analysis Focus:** Detail the speaker's eye contact patterns. Do they connect with individuals? Is their gaze varied or fixed? Do they appear to be reading or looking elsewhere? Note if the eye contact feels genuine and inclusive of the entire audience.

Vocal Delivery:
- **Best Practices:** Speaker should vary their pace, volume, and tone to maintain audience interest and emphasize key points. Speak clearly and loudly enough for all to hear, using proper enunciation. Avoid a monotonous delivery, speaking too quickly or too softly, or excessive use of filler words (e.g., "um," "uh," "like"). Pauses can be used effectively for emphasis.
- **Analysis Focus:** Assess the speaker's pace (too fast, too slow, varied), volume (too loud, too soft, inconsistent), clarity of speech, and tonal variation. Identify any distracting filler words or vocal tics. Comment on the impact of their vocal choices on message delivery.

Content & Structure:
- **Best Practices:** The message should be clear, concise, and logically organized with a strong introduction, well-structured main points, smooth transitions, and a compelling conclusion. Supporting evidence, examples, or data should be relevant and enhance understanding. The content should be tailored to the audience.
- **Analysis Focus:** Evaluate the clarity of the speaker's message, the logical flow of their arguments, and the effectiveness of their introduction and conclusion. Are the main points well-supported? Are transitions clear? Is the content engaging and relevant to the assumed audience?

Nervousness/Comfort:
- **Best Practices:** While some nervousness is normal, a comfortable speaker exhibits natural gestures, varied vocal delivery, and an engaged presence. Signs of unmanaged nervousness can include visible trembling, sweating, stiff movements, a strained voice, or rapid breathing.
- **Analysis Focus:** Identify specific physical or vocal indicators of nervousness or comfort. Describe how these manifest and their impact on the overall presentation. Note moments where the speaker appears more or less at ease.

For every category except "Summary", fill in Analysis, an array of Recommendations, and the exact Relevant Video Section (timestamp).
- **Analysis:** Provide a detailed assessment based on the best practices.
- **Recommendations:** Offer specific, actionable suggestions for improvement aligned with the best practices.
- **Relevant Video Section:** Provide the *exact* start and end times (e.g., "0:07-0:14") where the observed behavior or recommendation is most evident in the video.

For "Summary", fill in Overall Assessment and an array of Actionable Steps.
- **Overall Assessment:** Provide a concise but comprehensive evaluation of the speaker's performance, highlighting key strengths and primary areas for improvement across all categories.
- **Actionable Steps:** List prioritized, practical, and concrete steps the speaker can take to improve their public speaking, directly derived from the recommendations in the individual categories.

Be as precise as possible about timestamps (e.g. "0:07-0:14"). Do not output anything else."""



def analyze(video):
    # Load environment variables
    from dotenv import load_dotenv
    import os
    load_dotenv()
    
    # Step 1: Set up the Gemini client
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    # Step 2: Upload the video
    myfile = client.files.upload(file=video)

    # Step 3: Wait until file is ACTIVE
    print("Waiting for video to finish processing...")
    while True:
        status = client.files.get(name=myfile.name)  # ✅ correct
        if status.state.name == "ACTIVE":
            print("✅ File is ready.")
            break
        else:
            print(f"⏳ Current status: {status.state.name}... retrying in 2 seconds")
            time.sleep(2)

    # Step 4: Generate response
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            status,
            prompt
        ]
    )


    import re
    import json

    # Extract content between ```json ... ``` using regex
    match = re.search(r"```json\s*(\{.*?\})\s*```", response.text, re.DOTALL)

    if match:
        json_str = match.group(1)
        try:
            parsed = json.loads(json_str)
            with open("feedback.json", "w") as f:
                json.dump(parsed, f, indent=2)
            print("✅ JSON extracted and saved.")
        except json.JSONDecodeError:
            print("⚠️ JSON block found but couldn't parse it.")
    else:
        print("⚠️ No JSON block found in the response.")


    # Step 5: Print the results
    print(response.text)