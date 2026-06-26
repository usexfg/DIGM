use anyhow::{Result, Context};
use std::net::UdpSocket;
use std::sync::Arc;
use tokio::sync::mpsc;

/// Audio chunk sent over UDP — ~256KB chunks with sequence numbering.
#[derive(Debug, Clone)]
pub struct AudioChunk {
    pub stream_id: u32,
    pub sequence: u32,
    pub data: Vec<u8>,
}

impl AudioChunk {
    const HEADER_SIZE: usize = 12;

    pub fn pack(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(Self::HEADER_SIZE + self.data.len());
        buf.extend_from_slice(&self.stream_id.to_be_bytes());
        buf.extend_from_slice(&self.sequence.to_be_bytes());
        buf.extend_from_slice(&(self.data.len() as u32).to_be_bytes());
        buf.extend_from_slice(&self.data);
        buf
    }

    pub fn unpack(buf: &[u8]) -> Option<Self> {
        if buf.len() < Self::HEADER_SIZE {
            return None;
        }
        let stream_id = u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]]);
        let sequence = u32::from_be_bytes([buf[4], buf[5], buf[6], buf[7]]);
        let data_len = u32::from_be_bytes([buf[8], buf[9], buf[10], buf[11]]) as usize;
        if buf.len() < Self::HEADER_SIZE + data_len {
            return None;
        }
        Some(AudioChunk {
            stream_id,
            sequence,
            data: buf[Self::HEADER_SIZE..Self::HEADER_SIZE + data_len].to_vec(),
        })
    }
}

/// UDP sender for streaming audio chunks to a peer.
pub struct UdpAudioSender {
    socket: UdpSocket,
}

impl UdpAudioSender {
    pub fn bind(addr: &str) -> Result<Self> {
        let socket = UdpSocket::bind(addr)
            .context("Failed to bind UDP sender socket")?;
        socket.set_nonblocking(true)?;
        Ok(UdpAudioSender { socket })
    }

    pub fn send_to(&self, chunk: &AudioChunk, peer_addr: &str) -> Result<usize> {
        let packed = chunk.pack();
        let sent = self.socket.send_to(&packed, peer_addr)
            .context("UDP send failed")?;
        Ok(sent)
    }
}

/// UDP receiver for incoming audio chunks.
pub struct UdpAudioReceiver {
    socket: UdpSocket,
}

impl UdpAudioReceiver {
    pub fn bind(addr: &str) -> Result<Self> {
        let socket = UdpSocket::bind(addr)
            .context("Failed to bind UDP receiver socket")?;
        socket.set_nonblocking(true)?;
        Ok(UdpAudioReceiver { socket })
    }

    /// Non-blocking receive. Returns None if no data available.
    pub fn try_recv(&self) -> Option<AudioChunk> {
        let mut buf = [0u8; 65536];
        match self.socket.recv_from(&mut buf) {
            Ok((len, _src)) => AudioChunk::unpack(&buf[..len]),
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => None,
            Err(_) => None,
        }
    }
}

/// Wraps a UDP sender with loss resilience via FEC redundancy.
/// Sends each chunk N times to mitigate packet loss.
pub struct RedundantSender {
    sender: Arc<UdpAudioSender>,
    redundancy: u32,
}

impl RedundantSender {
    pub fn new(sender: Arc<UdpAudioSender>, redundancy: u32) -> Self {
        RedundantSender { sender, redundancy }
    }

    pub fn send(&self, chunk: &AudioChunk, peer_addr: &str) -> Result<()> {
        let packed = chunk.pack();
        for _ in 0..self.redundancy {
            self.sender.socket.send_to(&packed, peer_addr)?;
        }
        Ok(())
    }
}

/// Async UDP audio channel using tokio channels.
pub struct UdpAudioChannel {
    pub sender: mpsc::Sender<AudioChunk>,
    pub receiver: mpsc::Receiver<AudioChunk>,
    /// Peer address for outgoing chunks
    pub peer_addr: String,
}

impl UdpAudioChannel {
    pub fn new(peer_addr: &str, buffer_size: usize) -> Self {
        let (tx, rx) = mpsc::channel(buffer_size);
        UdpAudioChannel {
            sender: tx,
            receiver: rx,
            peer_addr: peer_addr.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_chunk_pack_unpack() {
        let chunk = AudioChunk {
            stream_id: 42,
            sequence: 7,
            data: vec![1, 2, 3, 4, 5],
        };
        let packed = chunk.pack();
        let unpacked = AudioChunk::unpack(&packed).unwrap();
        assert_eq!(unpacked.stream_id, 42);
        assert_eq!(unpacked.sequence, 7);
        assert_eq!(unpacked.data, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_udp_send_recv() {
        let sender = UdpAudioSender::bind("127.0.0.1:0").unwrap();
        let receiver = UdpAudioReceiver::bind("127.0.0.1:0").unwrap();

        // Get the receiver's assigned port
        let recv_addr = receiver.socket.local_addr().unwrap();

        let chunk = AudioChunk {
            stream_id: 1,
            sequence: 0,
            data: vec![0xAB; 1000],
        };
        sender.send_to(&chunk, &recv_addr.to_string()).unwrap();

        // Give UDP a moment
        thread::sleep(Duration::from_millis(10));

        let received = receiver.try_recv().unwrap();
        assert_eq!(received.stream_id, 1);
        assert_eq!(received.sequence, 0);
        assert_eq!(received.data.len(), 1000);
    }

    #[test]
    fn test_redundant_send() {
        let sender = Arc::new(UdpAudioSender::bind("127.0.0.1:0").unwrap());
        let receiver = UdpAudioReceiver::bind("127.0.0.1:0").unwrap();
        let recv_addr = receiver.socket.local_addr().unwrap();

        let redundant = RedundantSender::new(sender, 3);
        let chunk = AudioChunk {
            stream_id: 8,
            sequence: 1,
            data: vec![0xCD; 500],
        };
        redundant.send(&chunk, &recv_addr.to_string()).unwrap();

        thread::sleep(Duration::from_millis(10));

        // Should receive at least one (UDP is generally reliable on localhost)
        let received = receiver.try_recv().unwrap();
        assert_eq!(received.sequence, 1);
    }
}
