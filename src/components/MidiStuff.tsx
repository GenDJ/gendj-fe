import React, { useState, useEffect } from 'react';

export default function MidiStuffPage() {
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [midiAccess, setMidiAccess] = useState<WebMidi.MIDIAccess | null>(null);
  const [isMapping, setIsMapping] = useState<boolean>(false);
  const [mappedCC, setMappedCC] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
      console.log('Web MIDI API not supported in this browser');
    }
  }, []);

  useEffect(() => {
    if (midiAccess) {
      midiAccess.inputs.forEach(input => {
        input.onmidimessage = getMIDIMessage;
      });
    }
  }, [midiAccess, isMapping, mappedCC]);

  function onMIDISuccess(access: WebMidi.MIDIAccess) {
    console.log('MIDI Access Success');
    setMidiAccess(access);

    access.inputs.forEach(input => {
      console.log(`Input port: ${input.name}`);
    });

    access.onstatechange = event => {
      console.log(
        `Port: ${event.port.type} - ${event.port.name} - ${event.port.state}`,
      );
    };
  }

  function onMIDIFailure(error: any) {
    console.log('Could not access your MIDI devices.', error);
  }

  function getMIDIMessage(message: WebMidi.MIDIMessageEvent) {
    console.log('MIDI Message:', message.data);

    const [status, data1, data2] = message.data;

    if (isMapping && status === 176) {
      // 176 is the status for Control Change on channel 1
      setMappedCC(data1);
      setIsMapping(false);
      console.log(`Mapped to CC: ${data1}`);
    }

    if (!isMapping && status === 176 && data1 === mappedCC) {
      setSliderValue(data2);
    }
  }

  function handleMapButtonClick() {
    setIsMapping(true);
    setMappedCC(null);
    console.log('Move a fader on your MIDI controller to map it.');
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
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={!midiAccess}
          >
            {isMapping ? 'Mapping...' : 'Map to MIDI'}
          </button>
        </div>
        <p>Slider Value: {sliderValue}</p>
        <p>Mapped CC: {mappedCC !== null ? mappedCC : 'Not mapped'}</p>
        <p>
          Mapping Status: {isMapping ? 'Mapping in progress' : 'Not mapping'}
        </p>
        {!navigator.requestMIDIAccess && (
          <p className="text-red-500">
            Web MIDI API not supported in this browser
          </p>
        )}
      </div>
    </div>
  );
}
