import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WebMidi, Input, MessageEvent } from 'webmidi';

interface MidiStuffPageProps {
  sendPrompt: (promptIndex: number) => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  secondPrompt: string;
  setSecondPrompt: React.Dispatch<React.SetStateAction<string>>;
  blendValue: number;
  setBlendValue: React.Dispatch<React.SetStateAction<number>>;
}
enum MappableActionEnum {
  Fader = 'fader',
  LoadFirstPrompt = 'load_first_prompt',
  LoadSecondPrompt = 'load_second_prompt',
  PromptSelectUp = 'prompt_select_up',
  PromptSelectDown = 'prompt_select_down',
  PromptSubmit = 'prompt_submit',
  SecondPromptSubmit = 'second_prompt_submit',
  PreviousCamera = 'previous_camera',
  NextCamera = 'next_camera',
}

type MappableAction = typeof MappableActionEnum;

const mappableActionTitles: Record<MappableActionEnum, string> = {
  [MappableActionEnum.Fader]: 'Fader',
  [MappableActionEnum.LoadFirstPrompt]: 'Load First Prompt',
  [MappableActionEnum.LoadSecondPrompt]: 'Load Second Prompt',
  [MappableActionEnum.PromptSelectUp]: 'Prompt Select Up',
  [MappableActionEnum.PromptSelectDown]: 'Prompt Select Down',
  [MappableActionEnum.PromptSubmit]: 'First Prompt Submit',
  [MappableActionEnum.SecondPromptSubmit]: 'Second Prompt Submit',
  [MappableActionEnum.PreviousCamera]: 'Previous camera',
  [MappableActionEnum.NextCamera]: 'Next camera',
};

function findMappedControl(
  action: MappableActionEnum,
  mappedControlRef: React.MutableRefObject<Record<string, MappableActionEnum>>,
): string | undefined {
  if (!mappedControlRef?.current) {
    return undefined;
  }
  const entry = Object.entries(mappedControlRef.current).find(
    ([_, value]) => value === action,
  );
  return entry ? entry[0] : undefined;
}

interface MidiMapModalProps {
  mappingTarget: MappableActionEnum | null;
  mappedControlRef: React.MutableRefObject<Record<string, MappableActionEnum>>;
  setMappingTarget: React.Dispatch<
    React.SetStateAction<MappableActionEnum | null>
  >;
  mappingTargetRef: React.MutableRefObject<MappableActionEnum | null>;
  handleMapButtonClick: (action: MappableActionEnum) => void;
  setIsMappingBoth: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMapMidiModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  midiEnabled: boolean;
  isMapping: boolean;
  isMappingRef: React.MutableRefObject<boolean>;
}

interface PromptLibraryModalProps {
  promptLibrary: string[];
  setPromptLibrary: React.Dispatch<React.SetStateAction<string[]>>;
  setIsPromptLibraryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const MidiMapModal: React.FC<MidiMapModalProps> = ({
  mappingTarget,
  mappedControlRef,
  setMappingTarget,
  mappingTargetRef,
  handleMapButtonClick,
  setIsMappingBoth,
  setIsMapMidiModalOpen,
  midiEnabled,
  isMapping,
  isMappingRef,
  warp,
}) => {
  const logMappedControls = () => {
    console.log('Mapped Controls:', mappedControlRef?.current);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-100">MIDI Mapping</h1>
          {mappingTarget ? (
            <p className="text-gray-300">
              Move a fader or press a button on your MIDI controller to map it
              to{' '}
              <span className="font-bold text-blue-400">
                {mappableActionTitles[mappingTarget]}
              </span>
              .
            </p>
          ) : (
            <p className="text-gray-300">Select an action to map:</p>
          )}
          <div className="space-y-4">
            {Object.entries(mappableActionTitles).map(
              ([actionKey, actionTitle]) => {
                const action = actionKey as MappableActionEnum;
                const mappedControl = findMappedControl(
                  action,
                  mappedControlRef,
                );
                return (
                  <div
                    key={action}
                    className="grid grid-cols-[1fr,auto,auto] gap-4 items-center"
                  >
                    <span className="text-gray-300">{actionTitle}</span>
                    <span className="text-gray-400 text-sm">
                      {mappedControl}
                    </span>
                    <button
                      onClick={() => handleMapButtonClick(action)}
                      className={`text-xs w-10 h-10 rounded-lg border-2 border-blue-500 text-blue-400 font-bold
                      flex items-center justify-center relative overflow-hidden
                      ${!midiEnabled && 'opacity-50 cursor-not-allowed'}
                      ${
                        isMapping && mappingTarget === action
                          ? 'bg-blue-500 text-gray-900'
                          : 'hover:bg-blue-600 hover:text-gray-900'
                      }
                      transition-all duration-300`}
                      disabled={!midiEnabled}
                    >
                      Map MIDI
                    </button>
                  </div>
                );
              },
            )}
          </div>
        </div>
        <div className="p-6 bg-gray-700/50 rounded-b-xl space-y-4">
          <button
            onClick={() => {
              setIsMappingBoth(false);
              setIsMapMidiModalOpen(false);
            }}
            className="w-full px-4 py-2 bg-red-600 text-gray-100 rounded-md
              hover:bg-red-700 transition-colors duration-300"
          >
            Close
          </button>
          {/* <button
            onClick={logMappedControls}
            className="w-full px-4 py-2 bg-gray-600 text-gray-300 rounded-md
              hover:bg-gray-700 transition-colors duration-300"
          >
            Log Mapped Controls
          </button> */}
        </div>
      </div>
    </div>
  );
};

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  promptLibrary,
  setPromptLibrary,
  setIsPromptLibraryModalOpen,
}) => {
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    localStorage.setItem('promptLibrary', JSON.stringify(promptLibrary));
  }, [promptLibrary]);

  const handleDeletePrompt = (index: number) => {
    const updatedLibrary = promptLibrary.filter((_, i) => i !== index);
    setPromptLibrary(updatedLibrary);
  };

  const handleAddPrompt = () => {
    if (newPrompt.trim()) {
      setPromptLibrary([...promptLibrary, newPrompt.trim()]);
      setNewPrompt('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-100">Prompt Library</h1>
          <div className="space-y-4">
            {promptLibrary.map((prompt, index) => (
              <div key={index} className="flex justify-between items-center">
                <p className="text-gray-300">{prompt}</p>
                <button
                  onClick={() => handleDeletePrompt(index)}
                  className="text-red-400 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <textarea
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              className="w-full p-2 bg-gray-700 text-gray-100 rounded-md"
              placeholder="Enter a new prompt"
              rows={3}
            />
            <button
              onClick={handleAddPrompt}
              className="w-full px-4 py-2 bg-blue-600 text-gray-100 rounded-md
                hover:bg-blue-700 transition-colors duration-300"
            >
              Save to Library
            </button>
          </div>
        </div>
        <div className="p-6 bg-gray-700/50 rounded-b-xl">
          <button
            onClick={() => setIsPromptLibraryModalOpen(false)}
            className="w-full px-4 py-2 bg-red-600 text-gray-100 rounded-md
              hover:bg-red-700 transition-colors duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const MidiStuffPage: React.FC<MidiStuffPageProps> = ({
  sendPrompt,
  prompt,
  setPrompt,
  secondPrompt,
  setSecondPrompt,
  blendValue,
  setBlendValue,
  warp,
  switchToNextDevice,
  switchToPreviousDevice,
  selectedDeviceId,
}) => {
  const [midiEnabled, setMidiEnabled] = useState<boolean>(false);
  const [isMapping, setIsMapping] = useState<boolean>(false);
  const [mappingTarget, setMappingTarget] = useState<string | null>(null);
  const [promptLibrary, setPromptLibrary] = useState<string[]>([
    'a super cool dj wearing headphones, rose tinted aviator sunglasses, disco colors vibrant indoors digital illustration HDR talking',
    'an illustration of a cyborg, cyberpunk, futuristic, glowing eyes, hdr, ray tracing, bionic, metal skin, masterpiece, high resolution, computer generated',
    'an illustration of a super happy very happy person smiling joyful joyous',
    'an illustration of an old grey hair person super old aged oldest',
  ]);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);

  const promptLoadingMappableActionRef = useRef<MappableActionEnum | null>(
    null,
  );
  const [promptLoadingMappableAction, setPromptLoadingMappableAction] =
    useState<null | MappableActionEnum>(null);
  const [loadingSecondPrompt, setLoadingSecondPrompt] =
    useState<boolean>(false);

  const [isMapMidiModalOpen, setIsMapMidiModalOpen] = useState<boolean>(false);
  const [isPromptLibraryModalOpen, setIsPromptLibraryModalOpen] =
    useState<boolean>(false);

  const isMappingRef = useRef<boolean>(false);
  const mappingTargetRef = useRef<MappableAction | null>(null);
  const mappedControlsRef = useRef<Record<string, MappableAction>>({});

  useEffect(() => {
    // Load mapped controls from local storage
    // console.log('ls1212', localStorage.getItem('mappedControls'));
    if (localStorage.getItem('mappedControls')) {
      mappedControlsRef.current = JSON.parse(
        localStorage.getItem('mappedControls'),
      );
    }

    if (localStorage.getItem('promptLibrary')) {
      setPromptLibrary(JSON.parse(localStorage.getItem('promptLibrary')));
    }
  }, []);

  useEffect(() => {
    promptLoadingMappableActionRef.current = promptLoadingMappableAction;
  }, [promptLoadingMappableAction]);

  const handleAllMIDIMessages = useCallback(
    (event: MessageEvent) => {
      const [status, data1, data2] = event.message.data;
      const messageType = status >> 4;
      const channel = (status & 0xf) + 1;

      // console.log(
      //   `MIDI Message - Type: ${messageType.toString(
      //     16,
      //   )}, Channel: ${channel}, Data1: ${data1}, Data2: ${data2}`,
      // );

      if (
        (messageType === 0xb && data1 > 31) ||
        (messageType === 0x9 && data2 === 0)
      ) {
        return;
      }

      if (isMappingRef.current && mappingTargetRef?.current) {
        if (messageType === 0xb) {
          mappedControlsRef.current[`cc${channel}${data1}`] =
            mappingTargetRef.current;
          localStorage.setItem(
            'mappedControls',
            JSON.stringify(mappedControlsRef.current),
          );

          setIsMapping(false);
          setMappingTarget(null);
          console.log(
            `Mapped ${mappingTargetRef.current} to CC: ${data1} on channel ${channel}`,
          );
          mappingTargetRef.current = null;
        } else if (messageType === 0x9) {
          mappedControlsRef.current[`note${channel}${data1}`] =
            mappingTargetRef.current;
          localStorage.setItem(
            'mappedControls',
            JSON.stringify(mappedControlsRef.current),
          );

          setIsMapping(false);
          setMappingTarget(null);
          console.log(
            `Mapped ${mappingTargetRef.current} to Note: ${data1} on channel ${channel}`,
          );
          mappingTargetRef.current = null;
        }
      } else {
        if (messageType === 0xb || messageType === 0x9) {
          const mappedControl: MappableAction =
            mappedControlsRef?.current?.[
              `${messageType === 0xb ? 'cc' : 'note'}${channel}${data1}`
            ];
          if (mappedControl) {
            handleMappedControl(mappedControl, data2);
          }
        }
      }
    },
    [
      mappingTarget,
      warp?.podId,
      promptLoadingMappableAction,
      selectedPromptIndex,
      selectedDeviceId,
      prompt,
      secondPrompt,
    ],
  );

  const handleMappedControl = (target: string, value: number) => {
    switch (target) {
      case 'fader':
        setBlendValue(Number((value / 127).toFixed(2)));
        break;
      case 'load_first_prompt':
        setPrompt(promptLibrary[selectedPromptIndex]);
        break;
      case 'load_second_prompt':
        setSecondPrompt(promptLibrary[selectedPromptIndex]);
        break;
      case 'prompt_select_up':
        setSelectedPromptIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'prompt_select_down':
        setSelectedPromptIndex(prev =>
          prev < promptLibrary.length - 1 ? prev + 1 : prev,
        );
        break;

      case 'prompt_submit':
        console.log('ps1');
        sendPrompt(1);
        break;
      case 'second_prompt_submit':
        console.log('ps2');
        sendPrompt(2);
        break;
      case 'previous_camera':
        switchToPreviousDevice();
        break;
      case 'next_camera':
        switchToNextDevice();
        break;
    }
  };

  useEffect(() => {
    const enableWebMidi = async () => {
      try {
        await WebMidi.enable();
        console.log('WebMidi enabled!');
        setMidiEnabled(true);
      } catch (err) {
        console.error('WebMidi could not be enabled.', err);
      }
    };

    enableWebMidi();

    return () => {
      WebMidi.disable();
    };
  }, []);

  useEffect(() => {
    if (midiEnabled) {
      WebMidi.inputs.forEach((input: Input) => {
        input.addListener('midimessage', handleAllMIDIMessages);
      });
    }
    return () => {
      WebMidi.inputs.forEach((input: Input) => {
        input.removeListener('midimessage', handleAllMIDIMessages);
      });
    };
  }, [
    midiEnabled,
    warp?.podId,
    selectedPromptIndex,
    prompt,
    secondPrompt,
    selectedDeviceId,
  ]);

  const setIsMappingBoth = useCallback((value: boolean) => {
    setIsMapping(value);
    isMappingRef.current = value;
  }, []);

  const handleMapButtonClick = (target: string) => {
    setIsMapping(true);
    isMappingRef.current = true;
    setMappingTarget(target);
    mappingTargetRef.current = target;
    console.log(
      `Move a fader or press a button on your MIDI controller to map it to ${target}.`,
    );
  };

  const handlePromptSelect = (direction: 'up' | 'down' | 'select') => {
    switch (direction) {
      case 'up':
        setSelectedPromptIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'down':
        setSelectedPromptIndex(prev =>
          prev < promptLibrary.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'select':
        if (promptLoadingMappableActionRef?.current) {
          if (
            promptLoadingMappableActionRef?.current ===
            MappableActionEnum.LoadFirstPrompt
          ) {
            setPrompt(promptLibrary[selectedPromptIndex]);
            setPromptLoadingMappableAction(null);
          } else if (
            promptLoadingMappableActionRef?.current ===
            MappableActionEnum.LoadSecondPrompt
          ) {
            console.log('set second');
            setSecondPrompt(promptLibrary[selectedPromptIndex]);
            setPromptLoadingMappableAction(null);
          }
        }
        break;
    }
  };

  const handleOpenMidiMapModal = () => {
    setIsMapMidiModalOpen(true);
  };

  const handlePromptLibraryModal = () => {
    setIsPromptLibraryModalOpen(true);
  };

  return (
    <div className="flex flex-col items-center space-y-4 my-8">
      {isMapMidiModalOpen && (
        <MidiMapModal
          mappingTarget={mappingTarget}
          setMappingTarget={setMappingTarget}
          handleMapButtonClick={handleMapButtonClick}
          setIsMappingBoth={setIsMappingBoth}
          setIsMapMidiModalOpen={setIsMapMidiModalOpen}
          midiEnabled={midiEnabled}
          isMapping={isMapping}
          isMappingRef={isMappingRef}
          mappingTargetRef={mappingTargetRef}
          mappedControlRef={mappedControlsRef}
        />
      )}

      {isPromptLibraryModalOpen && (
        <PromptLibraryModal
          promptLibrary={promptLibrary}
          setPromptLibrary={setPromptLibrary}
          setIsPromptLibraryModalOpen={setIsPromptLibraryModalOpen}
        />
      )}

      {/* {isPromptSelectModalOpen && (
        <PromptSelectModal
          promptLibrary={promptLibrary}
          setPromptLibrary={setPromptLibrary}
          setIsPromptLibraryModalOpen={setIsPromptLibraryModalOpen}
        />
      )} */}
      <select
        value={selectedPromptIndex}
        onChange={e => setSelectedPromptIndex(Number(e.target.value))}
        className="mb-2 text-black w-full rounded-md p-2"
      >
        {promptLibrary.map((p, index) => (
          <option key={index} value={index}>
            {p}
          </option>
        ))}
      </select>
      <div className="flex items-center space-x-4">
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setPrompt(promptLibrary[selectedPromptIndex]);
            }}
            className={`px-4 py-2 text-white rounded bg-blue-500`}
          >
            Load First Prompt
          </button>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="mt-2 w-64 h-32 p-2 border rounded text-black"
          />
        </div>

        <div className="flex flex-col items-center w-full">
          <div className="flex space-x-2">
            <button
              onClick={() => handlePromptSelect('up')}
              className="px-2 py-1 bg-blue-500 rounded"
            >
              ▲
            </button>
            <button
              onClick={() => handlePromptSelect('down')}
              className="px-2 py-1 bg-blue-500 rounded"
            >
              ▼
            </button>
            {/* <button
              onClick={() => handlePromptSelect('select')}
              className="px-2 py-1 bg-green-500 text-white rounded"
            >
              Select
            </button> */}
          </div>
          <div className="flex flex-col">
            <button
              className="text-xs w-24 rounded-lg border-2 border-blue-500 text-blue-400 font-bold text-center overflow-hidden p-2 my-2"
              onClick={handleOpenMidiMapModal}
            >
              Map Midi
            </button>
            <button
              className="text-xs w-24 rounded-lg border-2 border-blue-500 text-blue-400 font-bold text-center overflow-hidden p-2 my-2"
              onClick={handlePromptLibraryModal}
            >
              Edit Library
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setSecondPrompt(promptLibrary[selectedPromptIndex]);
            }}
            className={`px-4 py-2 text-white rounded bg-blue-500`}
          >
            Load Second Prompt
          </button>
          <textarea
            value={secondPrompt}
            onChange={e => setSecondPrompt(e.target.value)}
            className="mt-2 w-64 h-32 p-2 border rounded text-black"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => sendPrompt(1)}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Submit Prompt 1
        </button>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={blendValue}
            onChange={e => setBlendValue(parseFloat(e.target.value))}
            className="w-64"
          />
        </div>
        <button
          onClick={() => sendPrompt(2)}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Submit Prompt 2
        </button>
      </div>
    </div>
  );
};

export default MidiStuffPage;
