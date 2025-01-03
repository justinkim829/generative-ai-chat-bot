import { useEffect, useRef, useState } from 'react';
import './newPrompt.css'
import Upload from '../upload/Upload';
import { IKImage } from 'imagekitio-react';
import model from '../../lib/gemini';
import Markdown from 'react-markdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { use } from 'react';

const NewPrompt = ( { data }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ],
  });
  // const formRef = useRef(null);
  const endRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [data, question, answer, img.dbData]);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.length ? question : undefined,
          answer,
          img: img.dbData?.filePath || undefined,
        }),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["chat", data._id] })
        .then(() => {
          formRef.current.reset();
          setQuestion("");
          setAnswer("");
          setImg({
            isLoading: false,
            error: "",
            dbData: {},
            aiData: {},
          });
        });
    },
    onError: (err) => {
      console.log(err);
    },
  });

  const add = async (textInput, isInitial) => {
    if (!isInitial) setQuestion(textInput);

    try {
      const result = await chat.sendMessageStream(Object.entries(img.aiData).length ?
      [img.aiData, textInput] : [textInput]);
      let accText = ""
      for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
      accText += chunkText;
      setAnswer(accText);
      }

      mutation.mutate();
    } catch (err) {
      console.error(err);
    }
  }

  const handleSubmit = async(e) => {
    e.preventDefault();

    const textInput = e.target.textInput.value;
    if (!textInput) return;

    add(textInput, false);
  }

  // In production, we don't need this (only for Strictmode developer)
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      if (data?.history?.length === 1) {
        add(data.history[0].parts[0].text, true);
      }
    }
    hasRun.current = true;
  }, []);

  return (
    <>
      {/* add new chat */}
      {img.isLoading && <div className="loading">Image Loading...</div>}
      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
          path={img.dbData?.filePath}
          width="380"
          transformation={ [{ width: 380 }] }
        />
      )}
      {question && <div className = "message user">{question}</div>}
      {answer && <div className = "message"><Markdown>{answer}</Markdown></div>}
      <div className="endChat" ref={endRef}></div>
      <form className='newForm' onSubmit={handleSubmit} ref={formRef}>
        <Upload setImg={setImg}/>
        <input id="file" type="file" multiple={false} hidden/>
        <input type="text" name='textInput' placeholder='Ask me anything...'/>
        <button>
          <img src="/arrow.png" alt="" />
        </button>
      </form>
    </>
  )
}

export default NewPrompt