import { router } from 'expo-router'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import React, { useState } from 'react'
import { Button, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from '../FirebaseConfig'

export default function Index(){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const singIn = async () => {
        try {
            const user = await signInWithEmailAndPassword(auth, email, password);
            if (user) router.replace('/(tabs)');
        } catch(error: any) {
            console.log(error)
            alert('Sing in failed: '+ error.message);
        }
    }
    const singUp = async () => {
         try {
            const user = await createUserWithEmailAndPassword(auth, email, password);
            if (user) router.replace('/(tabs)');

        } catch(error: any) {
            console.log(error)
            alert('Sing in failed: '+ error.message);
        }
    }
    return(
        <SafeAreaView>
            <View>
                <Text>Login</Text>

                <Text>Email</Text>
                <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                autoCapitalize="none"
                keyboardType="email-address"
                />

                <Text>Password</Text>
                <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                />

                <Button title="Sign In" onPress={singIn} />
                <Button title="Sign Up" onPress={singUp} />
            </View>                     
        </SafeAreaView>
    )

}

