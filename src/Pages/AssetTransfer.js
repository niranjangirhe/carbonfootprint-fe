import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { TextField, Button, Select, MenuItem, FormControl } from '@material-ui/core';
import { db } from "./firebase";
import { doc, getDoc, getDocs, query, collection, where, updateDoc, setDoc } from "firebase/firestore";
import { CONTRACT_ADDRESS } from "../constant"
import useStyles from './style';
import { useNavigate } from 'react-router-dom';
import { SHA256 } from 'crypto-js';
import { uploadJson } from "./upload.mjs"







const artifacts = require('../MyToken.json');
const contractABI = artifacts.abi;
const contractAddress = CONTRACT_ADDRESS;

const web3 = new Web3(window.ethereum);
const contract = new web3.eth.Contract(contractABI, contractAddress);




const AssetTransfer = ({ isConnected }) => {
  const classes = useStyles();
  const [blockNumber, setBlockNumber] = useState('');
  const [etherscanLink, setEtherscanLink] = useState('');
  const [txHash, setTxHash] = useState('');
  const [accountAddresses, setAccountAddresses] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [clients, setClients] = useState([]);
  const [client, setClient] = useState(null);
  const [quantity, setQuantity] = useState('');
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [me, setMe] = useState(null);
  const [transportation, setTransportation] = useState([]);
  const [transportInvolved, setTransportInvolved] = useState([]);
  const [transportInstance, setTransportInstance] = useState('');
  const [distanceInstance, setDistanceInstance] = useState('');
  const [cid, setCid] = useState('');


  useEffect(() => {
    const fetchAccountAddresses = async () => {
      if (window.ethereum) {
        try {
          // Request access to the user's accounts
          await window.ethereum.enable();

          // Get the selected Ethereum provider
          const provider = window.ethereum;

          // Create a web3 instance using the provider
          const web3 = new Web3(provider);

          // Get the current user's account addresses
          const accounts = await web3.eth.getAccounts();

          setAccountAddresses(accounts);
        } catch (error) {
          console.error('Error fetching account addresses:', error);
        }
      }
    };
    if (!isConnected) {
      navigate("/");
    }
    fetchAccountAddresses();
  });

  const fetchAllClient = async () => {
    setClients([]);
    setClient(null);
    const docRef = doc(db, "companies", walletAddress);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      if (!docSnap.data().clients) {
        alert("No clients registered for this company");
        return;
      }
      if (docSnap.data().clients.length > 0) {

        docSnap.data().clients.map(async (p) => {
          const docRef = doc(db, "companies", p);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            setClients((clients) => [...clients, { ...docSnap.data(), id: p }]);
          }
        })
      }
      else {
        alert("No products registered for this company");
      }

    } else {
      // doc.data() will be undefined in this case
      console.log("No such document!");
    }
  }


  const fetchProduct = async () => {
    setProducts([]);
    setProduct(null);
    setQuantity('');
    setTransportInvolved([]);
    setTransportInstance('');
    setDistanceInstance('');




    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://deep-index.moralis.io/api/v2/" + walletAddress + "/nft?chain=sepolia&format=decimal&media_items=false");
    xhr.setRequestHeader("accept", "application/json");
    xhr.setRequestHeader("X-API-Key", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImQ3NWMwZWNkLTA0NWQtNGU0Yy05NmY2LTg0NTljZmZkZjJmNiIsIm9yZ0lkIjoiMzQ2MzI1IiwidXNlcklkIjoiMzU2MDA1IiwidHlwZUlkIjoiYjkxZDk0YTYtMDdmZS00NjgwLTlkOWItZmJlNTEyZjliOGYwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE2ODgyODI0NjUsImV4cCI6NDg0NDA0MjQ2NX0.ZeKB90GPvHv947vltLHWtNnAu_ubOoKFIMwpt6fg5k4");
    xhr.onload = function () {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        console.log(response.result);
        var productFound = false;
        response.result.map(async (p) => {
          if ((p.token_address).toString() == CONTRACT_ADDRESS.toLowerCase()) {
            console.log("Product found");
            productFound = true;
            const realTokenId = p.token_id;


            const docRef = doc(db, "PsuedoToRealToken", realTokenId);
            const document = await getDoc(docRef);
            if (document.exists()) {
              console.log(document.id, " => ", document.data());
              const psuedoTokenId = document.data().psuedoTokenId;
              const cid = document.data().cid;
              console.log(psuedoTokenId);

              const psuedoTokenIdJson = JSON.parse(psuedoTokenId);
              const docProductRef = doc(db, "products", psuedoTokenIdJson.P);
              const docProductSnap = await getDoc(docProductRef);
              let pDetail = null;
              if (docProductSnap.exists()) {
                console.log("Document data:", docProductSnap.data());
                pDetail = docProductSnap.data();
              }
              const docManufacturerRef = doc(db, "companies", psuedoTokenIdJson.M);
              const docManufacturerSnap = await getDoc(docManufacturerRef);
              let mDetail = null;
              if (docManufacturerSnap.exists()) {
                console.log("Document data:", docManufacturerSnap.data());
                mDetail = docManufacturerSnap.data();
              }
              if (pDetail && mDetail) {
                const trace = pDetail.productName + " (Manufacturer: " + mDetail.companyName + ")";
                setProducts((products) => [...products, { ...p, trace: trace, psuedoTokenIdJson: psuedoTokenIdJson, pDetail: pDetail, mDetail: mDetail, cid: cid }]);
              }
            }


          }
        })
        if (!productFound) {
          alert("No products minted");
        }
      } else {
        console.log(xhr.status);
      }
    };
    xhr.send();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (me.companyType == 'Logistics' && transportInvolved.length == 0) {
      alert("Please select atleast one transport company");
      return;
    }

    try {
      console.log("Product", product.psuedoTokenIdJson);
      let psuedoTokenIdJson = product.psuedoTokenIdJson;

      if (client.companyType == "Logistics") {
        if (!psuedoTokenIdJson.L) {
          psuedoTokenIdJson.L = [client.id];
        }
        else {
          psuedoTokenIdJson.L.push(client.id);
        }
      }
      else if (client.companyType == "Retailer") {
        if (!psuedoTokenIdJson.R) {
          psuedoTokenIdJson.R = [client.id];
        }
        else {
          psuedoTokenIdJson.R.push(client.id);
        }
      }
      else if (client.companyType == "Manufacturer") {
        if (!psuedoTokenIdJson.S) {
          psuedoTokenIdJson.St = [client.id];
        }
        else {
          psuedoTokenIdJson.St.push(client.id);
        }
      }
      console.log("Product", psuedoTokenIdJson);

      const psuedoTokenId = JSON.stringify(psuedoTokenIdJson);

      const hash = SHA256(psuedoTokenId).toString();
      const queryRef = query(collection(db, "PsuedoToRealToken"), where("hash", "==", hash));
      const querySnap = await getDocs(queryRef);
      let realTokenId = 0;
      if (querySnap.size > 0) {
        querySnap.forEach((doc) => {
          console.log(doc.id, " => ", doc.data());
          realTokenId = doc.id;
        });
        const receipt = await contract.methods
          .burnNmint(walletAddress, client.id, product.token_id, String(realTokenId), quantity)
          .send({ from: window.ethereum.selectedAddress });
        setBlockNumber(receipt.blockNumber);
        setTxHash(receipt.transactionHash);
        setEtherscanLink(`https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
        console.log(receipt);
      }
      else {
        console.log("No such document!");
        const docRef = doc(db, "Data", "Token");
        const docSnap = await getDoc(docRef);

        const url = "https://ipfs.io/ipfs/" + product.cid;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = async function () {
          var status = xhr.status;
          if (status === 200) {
            // console.log(xhr.response);
            const data = xhr.response;
            let nftJson = data;

            if (me.companyType == "Logistics") {
              const foundLogistics = nftJson.logistics.findIndex(logistic => logistic.companyId === walletAddress);
              if (foundLogistics != -1) {
                console.log("Found logistics object:", foundLogistics);
                nftJson.logistics[foundLogistics].transportInvolved = transportInvolved;
                console.log("Updated logistics object:", nftJson);
                let totalCarbon = nftJson.totalCarbon;
                for (const t in transportInvolved) {
                  // console.log(transportInvolved[t].Distance, product.pDetail.weight, transportInvolved[t].Transport.carbonFootprintPKMPKG);
                  totalCarbon += parseFloat(transportInvolved[t].Distance) * parseFloat(product.pDetail.weight) * parseFloat(transportInvolved[t].Transport.carbonFootprintPKMPKG);
                }
                nftJson.totalCarbon = totalCarbon;
              } else {
                alert("Logistics object not found.")
                return;
              }
            }
            const clientData = {
              companyId: client.id,
              companyName: client.companyName,
              companyAddress: client.companyAddress,
              companyZipCode: client.companyZipCode,
              companyWebsite: client.companyWebsite,
              companyEmail: client.companyEmail,
              companyPhone: client.companyPhone,
              companyScale: client.companyScale,
              companyLogo: client.companyLogo,
            }
            if (client.companyType == "Logistics") {

              if (!nftJson.logistics) {
                nftJson.logistics = [clientData];
              }
              else {
                nftJson.logistics.push(clientData);
              }
            }
            else if (client.companyType == "Retailer") {

              nftJson.retailer = clientData;
            } else if (client.companyType == "Manufacturer") {
              nftJson.currentlyAt = clientData;
            }
            console.log("Product", nftJson);

            if (docSnap.exists()) {
              console.log("Document data:", docSnap.data());
              realTokenId = docSnap.data().currentTokenId + 1;

              const receipt = await contract.methods
                .burnNmint(walletAddress, client.id, product.token_id, String(realTokenId), quantity)
                .send({ from: window.ethereum.selectedAddress });
              setBlockNumber(receipt.blockNumber);
              setTxHash(receipt.transactionHash);
              setEtherscanLink(`https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
              console.log(receipt);

              const nftJsonString = JSON.stringify(nftJson);
              console.log("nftJsonString", nftJson);
              const CID = await uploadJson(nftJsonString);
              setCid(CID);

              await updateDoc(docRef, {
                currentTokenId: realTokenId
              });
              await setDoc(doc(db, "PsuedoToRealToken", String(realTokenId)), {
                psuedoTokenId: psuedoTokenId,
                hash: hash,
                cid: CID
              });
            }

          }
          else {
            alert("Error in fetching data, Internet might be down")
            return;
          }
        };
        xhr.send();


      }
      console.log(walletAddress, client.id, product.token_id, realTokenId, quantity);

    } catch (error) {
      console.error('Error creating commit:', error);
    }
  };

  const handleRedirect = (url) => {
    window.open(url, '_blank');
  };

  const handleMe = async (address) => {
    setWalletAddress(address);
    const docRef = doc(db, "companies", address);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      setMe(docSnap.data());
      if (docSnap.data().companyType == 'Logistics') {
        if (docSnap.data().transportation) {
          for (const t of docSnap.data().transportation) {
            const docRef = doc(db, "transportation", t);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              console.log("Document data:", docSnap.data());
              setTransportation((transportation) => [...transportation, docSnap.data()]);
            }
          }
        }
        else {
          alert("No transportation assigned");
          setWalletAddress('');
        }
      }
    }
  };

  const addTransport = async (e) => {
    if (transportInstance == '' || distanceInstance == '' || distanceInstance <= 0) {
      alert("Enter all details");
      return;
    }
    setTransportInvolved((transportInvolved) => [...transportInvolved, { Transport: transportInstance, Distance: distanceInstance }]);
    setTransportInstance('');
    setDistanceInstance('');
  }

  return (
    <div className={classes.wrapper}>
      <h1>Asset Transfer</h1>
      <form onSubmit={handleSubmit} className={classes.form}>
        <FormControl className={classes.input}>
          <Select
            value={walletAddress}
            onChange={(e) => handleMe(e.target.value)}
            displayEmpty
            required
          >
            <MenuItem value='' disabled>Select account address</MenuItem>
            {accountAddresses.map((address, index) => (
              <MenuItem value={address} key={index}>{address}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {walletAddress && (
          <Button
            className={classes.button}
            variant="contained"
            color="primary"
            onClick={fetchAllClient}
          >
            Fetch clients
          </Button>
        )}
        {clients.length > 0 && (
          <>
            <FormControl className={classes.input}>
              <Select
                value={client ? client : ''}
                onChange={(e) => setClient(e.target.value)}
                displayEmpty
                required
              >
                <MenuItem value='' disabled>Select Client</MenuItem>
                {clients.map((p, index) => (
                  <MenuItem value={p} key={index}>{p.companyName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Wallet address to whom the NFT will be transfered"
              value={client ? client.id : ''}
              fullWidth
              className={classes.input}
              disabled
              required
            />
            {client && (
              <>
                <Button
                  className={classes.button}
                  variant="contained"
                  color="primary"
                  onClick={fetchProduct}
                >
                  Fetch Products
                </Button>


                {products.length > 0 && (
                  <>
                    <FormControl className={classes.input}>
                      <Select
                        value={product ? product : ''}
                        onChange={(e) => setProduct(e.target.value)}
                        displayEmpty
                        required
                      >
                        <MenuItem value='' disabled>Select Product</MenuItem>
                        {products.map((p, index) => (
                          <MenuItem value={p} key={index}>{p.trace}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="NFT Token Id"
                      value={product ? product.token_id : ''}
                      fullWidth
                      className={classes.input}
                      disabled
                      required
                    />
                    {product && (

                      <TextField
                        label={"Product Amount (available: " + product.amount + ")"}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        fullWidth
                        className={classes.input}
                        required
                        type="number"
                        InputProps={{
                          inputProps: {
                            max: product.amount, min: 1
                          }
                        }}
                      />
                    )}
                    {me && me.companyType === 'Logistics' && product && (
                      <>
                        <ol>
                          {transportInvolved.map((item, index) => (
                            <li key={index}>
                              <span>{item.Transport.vehicleName} </span>
                              <span>{item.Distance}</span>
                            </li>
                          ))}
                        </ol>
                        <FormControl className={classes.input}>
                          <Select
                            value={transportInstance}
                            onChange={(e) => setTransportInstance(e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value='' disabled>Select Transportation</MenuItem>
                            {transportation.map((p, index) => (
                              <MenuItem value={p} key={index}>{p.vehicleName}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          label={"Distance Travelled in KM"}
                          value={distanceInstance}
                          onChange={(e) => setDistanceInstance(e.target.value)}
                          fullWidth
                          className={classes.input}
                          type="number"
                          InputProps={{
                            inputProps: {
                              min: 0
                            }
                          }}
                        />


                        <Button
                          className={classes.button}
                          variant="contained"
                          color="primary"
                          onClick={addTransport}
                        >
                          Add Transportation
                        </Button>

                      </>
                    )}
                  </>

                )}
              </>
            )}
          </>
        )}
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          type="submit"
        >
          Safe Transfer
        </Button>
      </form>
      {blockNumber && (
        <div>
          <div>
            <span>blockNumber: {blockNumber}</span>
          </div>
          <div>
            <span>txHash: {txHash}</span>
          </div>
          <div>
            <span>CID: {cid ? cid : 'Waiting...'}</span>
          </div>
          <div>
            <span>View NFT Metadata: {"https://ipfs.io/ipfs/" + cid }</span>
            <Button
              disabled={!cid}
              variant="contained"
              color="primary"
              onClick={() => handleRedirect("https://ipfs.io/ipfs/" + cid)}
            >
              {txHash ? 'Redirect' : 'Waiting...'}
            </Button>
          </div>
          <div>
            <span>View on Etherscan: {etherscanLink}</span>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleRedirect(etherscanLink)}
            >
              {txHash ? 'Redirect' : 'Waiting...'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetTransfer;
