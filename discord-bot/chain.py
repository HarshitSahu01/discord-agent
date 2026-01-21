from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

import os
from dotenv import load_dotenv

load_dotenv()

# Check for base_url in env
base_url = os.getenv("OPENAI_BASE_URL")

llm = ChatOpenAI(model="gpt-4o-mini", base_url=base_url)

async def generate_response(system_instruction: str, user_message: str, context: str = ""):
    try:
        final_system_prompt = system_instruction
        if context:
            final_system_prompt += f"\n\nContext from Knowledge Base:\n{context}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_instruction}"),
            ("user", "{user_message}")
        ])
        chain = prompt | llm | StrOutputParser()
        return await chain.ainvoke({"system_instruction": final_system_prompt, "user_message": user_message})
    except Exception as e:
        return f"Error generating response: {str(e)}"
