import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WebMidi, Input, MessageEvent } from 'webmidi';

export default function IsolatedMidiInput() {
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [midiEnabled, setMidiEnabled] = useState<boolean>(false);

  const [isMapping, setIsMapping] = useState<boolean>(false);
  const isMappingRef = useRef<boolean>(false);
  const mappedControlRef = useRef<{
    type: string;
    channel: number;
    control: number;
  } | null>(null);

  const mappingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAllMIDIMessages = useCallback((event: MessageEvent) => {
    const [status, data1, data2] = event.message.data;
    const messageType = status >> 4;
    const channel = (status & 0xf) + 1;

    console.log(
      `MIDI Message - Type: ${messageType.toString(
        16,
      )}, Channel: ${channel}, Data1: ${data1}, Data2: ${data2}`,
    );

    // Ignore CC messages above 31
    if (messageType === 0xb && data1 > 31) {
      return;
    }

    if (isMappingRef.current) {
      if (messageType === 0xb) {
        // Control Change
        console.log('Control Changezop1212');
        mappedControlRef.current = { type: 'cc', channel, control: data1 };
        setIsMappingBoth(false);
        console.log(`Mapped to CC: ${data1} on channel ${channel}`);
      } else if (messageType === 0x9) {
        // Note On
        console.log('note on zop1212');
        mappedControlRef.current = { type: 'note', channel, control: data1 };
        setIsMappingBoth(false);

        console.log(`Mapped to Note: ${data1} on channel ${channel}`);
      }
    } else if (mappedControlRef.current) {
      const mappedControl = mappedControlRef.current;
      if (
        mappedControl.type === 'cc' &&
        messageType === 0xb &&
        channel === mappedControl.channel &&
        data1 === mappedControl.control
      ) {
        setSliderValue(data2);
      } else if (
        mappedControl.type === 'note' &&
        messageType === 0x9 &&
        channel === mappedControl.channel &&
        data1 === mappedControl.control
      ) {
        setSliderValue(data2);
      }
    }
  }, []);

  const setupMIDIListeners = useCallback(() => {
    WebMidi.inputs.forEach((input: Input) => {
      input.addListener('midimessage', handleAllMIDIMessages);
    }); //zop
  }, []);

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
      setupMIDIListeners();
    }
    return () => {
      WebMidi.inputs.forEach((input: Input) => {
        input.removeListener('midimessage', handleAllMIDIMessages);
      });
    };
  }, [midiEnabled, setupMIDIListeners]);
  const setIsMappingBoth = useCallback((value: boolean) => {
    setIsMapping(value);
    isMappingRef.current = value;
  }, []);
  function handleMapButtonClick() {
    setIsMappingBoth(true);
    mappedControlRef.current = null;
    console.log(
      'Move a fader or press a button on your MIDI controller to map it.',
    );
  }

  return (
    <div className="flex justify-center items-center">
      <div className="flex flex-col justify-center">
        <h1>MIDI Stuff</h1>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="0"
            max="127"
            value={sliderValue}
            onChange={e => setSliderValue(parseInt(e.target.value))}
            className="w-64"
          />
          <button
            onClick={handleMapButtonClick}
            className={`w-8 h-8 rounded-full border-2 border-blue-500 text-blue-500 font-bold
    flex items-center justify-center
    relative overflow-hidden
    ${!midiEnabled && 'opacity-50 cursor-not-allowed'}
    ${isMapping && 'text-white'}
  `}
            disabled={!midiEnabled}
          >
            <span className="z-10">M</span>
            <div
              className={`
      absolute inset-0 bg-green-500 transition-transform duration-300 ease-out
      ${isMapping ? 'scale-100' : 'scale-0'}
    `}
            ></div>
          </button>
        </div>
        <p>Slider Value: {sliderValue}</p>
        <p>
          Mapped Control:{' '}
          {mappedControlRef.current
            ? `${mappedControlRef.current.type.toUpperCase()} ${
                mappedControlRef.current.control
              } on channel ${mappedControlRef.current.channel}`
            : 'Not mapped'}
        </p>
        <p>
          Mapping Status:{' '}
          {isMappingRef.current ? 'Mapping in progress' : 'Not mapping'}
        </p>
        <p>MIDI Status: {midiEnabled ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
}
