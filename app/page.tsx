// app/page.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { RiArrowUpCircleFill, RiStopFill } from "react-icons/ri";
import Markdown from "react-markdown";
import http from "./config/axios";
import API_URL from "./config/api_url";

export default function ChatPage() {
  const [chats, setChats] = useState<any>({});
  const [message, setMessage] = useState<any>("");
  const [loading, setLoading] = useState(true);
  const [resStage, setResStage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const getUserChats = async () => {
      try {
        let url: string;
        const thread_id = localStorage.getItem("thread_id");
        url = !thread_id ? "/chat" : `/chat?thread_id=${thread_id}`;

        const res = await http.get(url);
        if (res.status == 200) {
          !thread_id &&
            localStorage.setItem("thread_id", res.data["thread_id"]);
          setChats(res.data);
          console.log(res.data);
        } else {
          setChats([]);
        }
      } catch (error: any) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    getUserChats();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats.data]);

  const handleMessageSubmit = async (e: any) => {
    e.preventDefault();
    const thread_id = localStorage.getItem("thread_id");
    let res: any;

    let user_input = { type: "human", content: message };
    setChats((prev: any) => ({
      ...prev,
      data: [...prev.data, user_input],
    }));

    setMessage("");
    setResStage("start");

    try {
      res = await fetch(`${API_URL}/chat?thread_id=${thread_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            messages: [
              {
                role: "user",
                content: user_input.content,
              },
            ],
            context: [],
          },
        }),
      });
    } catch (error) {
      console.log(error);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      chunk.split("\n").forEach((line) => {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (jsonStr && jsonStr !== "[DONE]") {
            try {
              const obj = JSON.parse(jsonStr);
              // console.log("Object:", obj);
              if (obj.tools) setResStage("tools");
              else setResStage("");
              const response = obj.response;
              const brain = obj.brain;

              if (response && response.messages?.[0].content) {
                setChats((prev: any) => ({
                  ...prev,
                  data: [...prev.data, response.messages?.[0]],
                }));
              }

              else if (brain && brain.messages?.[0].content) {
                setChats((prev: any) => ({
                  ...prev,
                  data: [...prev.data, brain.messages?.[0]],
                }));
              }
            } catch (e) {
              console.error("Parse error:", jsonStr);
            }
          }
        }
      });
    }
  };

  const handleClearThread = () => {
    localStorage.removeItem("thread_id");
    // or localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="flex items-center justify-between mx-6 my-4">
        <h1 className="text-sky-600 font-semibold">Zipu</h1>
        <button
          onClick={handleClearThread}
          className="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm focus:outline-none"
        >
          Clear Thread
        </button>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-4 mb-48">
        {!loading ? (
          chats.data?.length > 0 ? (
            chats.data
              .filter((msg: any) => msg.content.trim() !== "")
              .map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex p-2 ${
                    msg.type == "human" ? "justify-end" : "justify-center"
                  }`}
                >
                  <div
                    className={`${
                      msg.type == "human"
                        ? "bg-gray-200 px-3 py-2 rounded-xl max-w-[80%] sm:max-w-[70%] md:max-w-[60%]"
                        : ""
                    }`}
                  >
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ))
          ) : (
            <h2 className="flex justify-center h-64 items-center text-xl font-semibold">  
              What can I help you with?
            </h2>
          )
        ) : (
          <Spinner />
        )}
        {resStage && (
          <div
            ref={scrollRef}
            className="flex gap-2 items-center font-semibold"
          >
            <Spinner custom={true} />
            {resStage === "tools" && <div>Wait a few more seconds</div>}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white backdrop-blur-md p-4">
        <form
          className="w-full flex justify-center"
          onSubmit={handleMessageSubmit}
        >
          <div className="w-full sm:w-[80%] md:w-[70%] flex justify-center">
            <div className="w-[85%] md:w-[90%]">
              <input
                type="text"
                name="no-autocomplete-user-input"
                autoComplete="off"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                id="user-input"
                className="w-full border-t border-b-2 border-l border-r-none border-gray-300 outline-none p-5 rounded-l-full bg-white"
                placeholder="Type your message..."
              />
            </div>
            <div className="w-[15%] md:w-[10%] flex justify-center border-t border-b-2 border-r rounded-r-full border-gray-300">
              <button
                type="submit"
                className="cursor-pointer"
                disabled={loading || !message || !!resStage}
              >
                {!resStage ? (
                  <RiArrowUpCircleFill
                    size={48}
                    color={`${loading || !message ? "gray" : "black"}`}
                  />
                ) : (
                  <RiStopFill size={48} color="black" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Spinner({ custom = false }: { custom?: boolean }) {
  return (
    <div className={`flex ${!custom && "items-center justify-center"} p-4`}>
      <div
        className={`${
          custom
            ? "h-8 w-8 border-white border-t-[#010847] border-b-[#012b12]"
            : "h-10 w-10 border-gray-100 border-t-gray-700"
        } animate-spin rounded-full border-4`}
      ></div>
    </div>
  );
}
