from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", timeout=20, max_retries=0)
respuesta = llm.invoke("Hola, ¿estás funcionando?")
print(respuesta.content)