#ifndef DIGM_H
#define DIGM_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Encode raw PCM audio to .digm format
// Returns 0 on success, negative on error:
//   -1: invalid parameters
//   -2: input file error
//   -3: encoding error
int digm_encode_from_raw(
    const char* input_path,
    const char* out_path,
    const uint8_t* signature,
    size_t sig_len,
    const uint8_t* public_key,
    size_t public_key_len
);

// Verify entire .digm file
// Returns:
//   0: verification OK
//   1: file read error
//   2: signature verification failed
//   3: file hash verification failed
int digm_verify_full(const char* path);

#ifdef __cplusplus
}
#endif

#endif // DIGM_H

