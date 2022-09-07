import { BigNumber, Contract, ethers, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, RANDOM_GAME_NFT_CONTRACT_ADDRESS } from "../constants";
import { FETCH_CREATED_GAME } from "../queries";
import styles from "../styles/Home.module.css";
import { subgraphQuery } from "../utils";

export default function Home() {

  const zero = BigNumber.from(0);
  const [ walletConnected, setWalletConnected ] = useState(false);
  const [ loading, setLoading ] = useState(false);
  const [ entryFee, setEntryFee ] = useState(zero);
  const [ maxPlayers, setMaxPlayers ] = useState(0);
  const [ players, setPlayers ] = useState([]);
  const [ logs, setLogs ] = useState([]);
  const [ isOwner, setIsOwner ] = useState(false);
  const [ winner, setWinner ] = useState();
  const [ gameStarted, setGameStarted ] = useState(false);
  const web3modalRef = useRef();

  const forceUpdate = React.useReducer(() => ({}), {})[1];


  const connectWallet = async() => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch(err) {
      console.error(err);
    }
  }

  const getProviderOrSigner = async(needSigner = false) => {
    const provider = await web3modalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if(chainId != 80001) {
      window.alert("Change network to mumbai");
      throw new Error("Change network to mumbai");
    }
    if(needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }

  const gameStart = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const gameContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, signer);
  
      const tx = await gameContract.startGame(maxPlayers, entryFee);
      setLoading(true);
      await tx.wait();
      setLoading(false);
    } catch(err) {
      console.error(err);
    }
  }

  const joinGame = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const gameContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, signer);
      console.log('entry fee:::', entryFee)
      const tx = await gameContract.joinedGame({ 
        value: entryFee
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);

    } catch(err) {
      console.error(err);
      setLoading(false);
    }
  }

  const checkIfStarted = async() => {
    try {
      const provider = await getProviderOrSigner();
      const gameContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, provider);

      const _gameStarted = await gameContract.gameStarted();
      const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
      const _game = _gameArray.games[0];

      const _logs = [];
      if(_gameStarted) {
        _logs = [`Game has started with ID: ${_game.id}`];
        if(_game.players && _game.players.length > 0) {
          _logs.push(`${_game.players.length} / ${_game.maxPlayers} already joined 👀 `);
          _game.players.forEach((player) => {
            _logs.push(`${player} joined 🏃‍♂️`);
          });
        }
        setEntryFee(BigNumber.from(_game.entryFee.toString()));
        setMaxPlayers(_game.maxPlayers);
      } else if (!gameStarted && _game.winner) {
        _logs = [
          `Last game has ended with ID: ${_game.id}`,
          `Winner is: ${_game.winner} 🎉 `,
          `Waiting for host to start new game....`,
        ];
        setWinner(_game.winner);
      }

      setLogs(_logs);
      setPlayers(_game.players);
      setGameStarted(_gameStarted);
      forceUpdate();

    } catch(err) {
      console.error(err);
    }
  }

  const getOwner = async() => {
    try {
      const provider = await getProviderOrSigner();
      const gameContract = new Contract(RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi, provider);
      
      const _owner = await gameContract.owner();
      const signer = await getProviderOrSigner(true);
      const signerAddress = await signer.getAddress();
      if(signerAddress.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch(err) {
      console.error(err);
    }
  }

  useEffect(() => {

    if(!walletConnected) {
       web3modalRef.current = new Web3Modal({
        network: "mumbai",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connectWallet();
      getOwner();
      checkIfStarted();
      setInterval(() => {
        checkIfStarted();
      }, 3000)
    }

  }, [walletConnected]);

  
  /*
    renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }
    // Render when the game has started
    if (gameStarted) {
      if (players.length === maxPlayers) {
        return (
          <button className={styles.button} disabled>
            Choosing winner...
          </button>
        );
      }
      return (
        <div>
          <button className={styles.button} onClick={joinGame}>
            Join Game 🚀
          </button>
        </div>
      );
    }
    // Start the game
    if (isOwner && !gameStarted) {
      return (
        <div>
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              // The user will enter the value in ether, we will need to convert
              // it to WEI using parseEther
              setEntryFee(
                e.target.value >= 0
                  ? utils.parseEther(e.target.value.toString())
                  : zero
              );
            }}
            placeholder="Entry Fee (ETH)"
          />
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              // The user will enter the value in ether, we will need to convert
              // it to WEI using parseEther
              setMaxPlayers(e.target.value ?? 0);
            }}
            placeholder="Max players"
          />
          <button className={styles.button} onClick={gameStart}>
            Start Game 🚀
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>LW3Punks</title>
        <meta name="description" content="LW3Punks-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Random Winner Game!</h1>
          <div className={styles.description}>
            Its a lottery game where a winner is chosen at random and wins the
            entire lottery pool
          </div>
          {renderButton()}
          {logs &&
            logs.map((log, index) => (
              <div className={styles.log} key={index}>
                {log}
              </div>
            ))}
        </div>
        <div>
          <img className={styles.image} src="./randomWinner.png" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Santhosh
      </footer>
    </div>
  );

}